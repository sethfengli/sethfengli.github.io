import { getDeviceId, storageGet, storageSet } from './storage'

export interface Wish {
  /** 全局唯一 id */
  id: string
  /** 称呼 */
  name: string
  /** 心愿内容 */
  text: string
  /** 提交时间戳 */
  createdAt: number
  /** 所属设备 ID —— 纯静态方案下用于“只能删除自己的愿望” */
  owner: string
}

/* ============================================================
   数据层接口（Repository 模式）
   —— 纯静态站点目前只有 Local 实现；
      未来接入 GitHub Issues 时新增 Remote 实现即可，UI 无需改动。
   ============================================================ */
export interface WishRepository {
  /** 读取全部心愿（含导入的备份与远程合并结果） */
  list(): Promise<Wish[]>
  /** 新增心愿，返回持久化后的完整对象 */
  create(input: { name: string; text: string }): Promise<Wish>
  /** 删除心愿；仅允许删除 owner === 本机 id 的心愿 */
  remove(id: string): Promise<boolean>
  /** 批量导入（JSON 备份恢复 / 跨设备合并） */
  importMany(wishes: Wish[]): Promise<number>
}

export function createWish(partial: Omit<Wish, 'id' | 'createdAt' | 'owner'>): Wish {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `w-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return {
    id,
    ...partial,
    createdAt: Date.now(),
    owner: getDeviceId(),
  }
}

/* ------------------------------------------------------------
   实现一：LocalStorageWishRepository（当前使用）
   ------------------------------------------------------------ */
const WISHES_KEY = 'hdc.wishes'

export class LocalWishRepository implements WishRepository {
  private read(): Wish[] {
    return storageGet<Wish[]>(WISHES_KEY, [])
  }

  async list(): Promise<Wish[]> {
    return this.read().sort((a, b) => b.createdAt - a.createdAt)
  }

  async create(input: { name: string; text: string }): Promise<Wish> {
    const wish = createWish(input)
    const all = this.read()
    all.push(wish)
    storageSet(WISHES_KEY, all)
    return wish
  }

  async remove(id: string): Promise<boolean> {
    const all = this.read()
    const mine = all.find((w) => w.id === id)
    if (!mine || mine.owner !== getDeviceId()) return false
    storageSet(
      WISHES_KEY,
      all.filter((w) => w.id !== id),
    )
    return true
  }

  async importMany(wishes: Wish[]): Promise<number> {
    const all = this.read()
    const seen = new Set(all.map((w) => w.id))
    let count = 0
    for (const w of wishes) {
      if (w && typeof w.text === 'string' && w.text && !seen.has(w.id)) {
        all.push({
          id: typeof w.id === 'string' && w.id ? w.id : createWish({ name: w.name, text: w.text }).id,
          name: typeof w.name === 'string' ? w.name.slice(0, 40) : '无名',
          text: w.text.slice(0, 120),
          createdAt: typeof w.createdAt === 'number' ? w.createdAt : Date.now(),
          owner: typeof w.owner === 'string' ? w.owner : getDeviceId(),
        })
        seen.add(w.id)
        count++
      }
    }
    storageSet(WISHES_KEY, all)
    return count
  }
}

/* ------------------------------------------------------------
   实现二：GitHubIssuesWishRepository（未来共享方案，预留）
   原理：以 GitHub 仓库的 issue 作为“共享心愿墙”。
   - create  → POST https://api.github.com/repos/{owner}/{repo}/issues
   - list    → GET  .../issues?state=open&labels=wish
   - remove  → 仅仓库协作者可删；普通访客通过“撤回留言”无法实现，
               因此该实现用于只读共享墙或需要 GitHub 登录授权的场景。
   注意：GitHub REST API 为公开接口，仅需个人访问令牌（PAT），
   令牌只保存在站长侧（或由访客自备），绝不下发到前端仓库。
   ------------------------------------------------------------ */
export interface GitHubIssueWishConfig {
  owner: string
  repo: string
  /** 可选：访客 GitHub PAT；缺省时只能读取公开 issue */
  token?: string
  label?: string
}

export class GitHubIssueWishRepository implements WishRepository {
  constructor(private cfg: GitHubIssueWishConfig) {}

  private async gh(path: string, init: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(this.cfg.token ? { Authorization: `Bearer ${this.cfg.token}` } : {}),
      ...((init.headers as Record<string, string>) ?? {}),
    }
    return fetch(`https://api.github.com/repos/${this.cfg.owner}/${this.cfg.repo}${path}`, {
      ...init,
      headers,
    })
  }

  async list(): Promise<Wish[]> {
    const label = this.cfg.label ?? 'wish'
    const res = await this.gh(`/issues?state=open&labels=${encodeURIComponent(label)}&per_page=100`)
    if (!res.ok) throw new Error(`GitHub Issues list failed: ${res.status}`)
    const issues = (await res.json()) as Array<{
      id: number
      title: string
      body: string
      created_at: string
    }>
    return issues
      .map((i) => ({
        id: `gh-${i.id}`,
        name: i.title.replace(/^祈福[:：]\s*/, '').slice(0, 40),
        text: (i.body ?? '').slice(0, 120),
        createdAt: Date.parse(i.created_at),
        owner: 'remote',
      }))
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  async create(input: { name: string; text: string }): Promise<Wish> {
    const res = await this.gh('/issues', {
      method: 'POST',
      body: JSON.stringify({
        title: `祈福：${input.name.slice(0, 40)}`,
        body: `${input.text}\n\n—— 来自慧灯禅院祈福墙`,
        labels: [this.cfg.label ?? 'wish'],
      }),
    })
    if (!res.ok) throw new Error(`GitHub Issues create failed: ${res.status}`)
    const issue = (await res.json()) as { id: number; created_at: string }
    return {
      id: `gh-${issue.id}`,
      name: input.name,
      text: input.text,
      createdAt: Date.parse(issue.created_at),
      owner: 'remote',
    }
  }

  async remove(id: string): Promise<boolean> {
    // issue 的删除/关闭需要仓库写权限；访客场景返回 false，
    // 产品层提示“共享心愿需管理员处理”。
    void id
    return false
  }

  async importMany(): Promise<number> {
    return 0
  }
}

/** 工厂：目前固定使用本地实现，未来切换一行代码即可 */
export function createWishRepository(): WishRepository {
  // return new GitHubIssueWishRepository({ owner: 'sethfengli', repo: 'sethfengli.github.io' })
  return new LocalWishRepository()
}
