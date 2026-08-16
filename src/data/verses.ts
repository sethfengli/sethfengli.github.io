export interface Verse {
  text: string
  source: string
}

export const VERSES: Verse[] = [
  { text: '一切有为法，如梦幻泡影，如露亦如电，应作如是观。', source: '《金刚经》' },
  { text: '心如工画师，能画诸世间；五蕴悉从生，无法而不造。', source: '《华严经》' },
  { text: '一灯能除千年暗，一智能灭万年愚。', source: '《六祖坛经》' },
  { text: '若人静坐一须臾，胜造恒沙七宝塔。', source: '《坐禅三昧经》' },
  { text: '诸恶莫作，众善奉行，自净其意，是诸佛教。', source: '《法句经》' },
  { text: '一念愚即般若绝，一念智即般若生。', source: '《六祖坛经》' },
  { text: '菩提本无树，明镜亦非台；本来无一物，何处惹尘埃。', source: '《六祖坛经》' },
  { text: '愿以此功德，庄严佛净土；上报四重恩，下济三途苦。', source: '《回向偈》' },
  { text: '狂心若歇，歇即菩提。', source: '《楞严经》' },
  { text: '随其心净，则佛土净。', source: '《维摩诘经》' },
  { text: '欲得净土，当净其心；随其心净，则佛土净。', source: '《维摩诘经》' },
  { text: '百花丛里过，片叶不沾身。', source: '禅门古德' },
  { text: '春有百花秋有月，夏有凉风冬有雪；若无闲事挂心头，便是人间好时节。', source: '无门慧开禅师' },
  { text: '平常心是道。', source: '南泉普愿禅师' },
  { text: '千江有水千江月，万里无云万里天。', source: '《嘉泰普灯录》' },
  { text: '放下屠刀，立地成佛。', source: '禅门公案' },
  { text: '时时勤拂拭，莫使惹尘埃。', source: '神秀大师' },
  { text: '制心一处，无事不办。', source: '《佛遗教经》' },
  { text: '以戒为师。', source: '《佛遗教经》' },
  { text: '惭愧得具足，犹如清凉池。', source: '《大般涅槃经》' },
  { text: '信为道元功德母，长养一切诸善法。', source: '《华严经》' },
  { text: '若众生心，忆佛念佛，现前当来，必定见佛。', source: '《大势至菩萨念佛圆通章》' },
  { text: '忆佛念佛，现前当来，必定见佛；去佛不远，不假方便，自得心开。', source: '《楞严经》' },
  { text: '自心众生无边誓愿度，自心烦恼无尽誓愿断，自性法门无量誓愿学，自性佛道无上誓愿成。', source: '《六祖坛经》' },
  { text: '佛法在世间，不离世间觉；离世觅菩提，恰如求兔角。', source: '《六祖坛经》' },
  { text: '不为自己求安乐，但愿众生得离苦。', source: '《华严经》' },
  { text: '慈悲为怀，方便为门。', source: '《大乘起信论》' },
  { text: '过去心不可得，现在心不可得，未来心不可得。', source: '《金刚经》' },
  { text: '应无所住而生其心。', source: '《金刚经》' },
  { text: '此有故彼有，此生故彼生；此无故彼无，此灭故彼灭。', source: '《杂阿含经》' },
]

/** 按“日 + 时辰”轮换，刷新即换 */
export function verseOfTheMoment(): Verse {
  const now = new Date()
  const dayIdx = Math.floor(now.getTime() / 86_400_000)
  const slot = (dayIdx + now.getHours()) % VERSES.length
  return VERSES[Math.abs(slot)]
}
