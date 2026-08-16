export interface ChantTrack {
  id: string
  labelZh: string
  labelEn: string
  file: string
  page: string
  author: string
  license: string
}

/** 梵呗音档：源自 Wikimedia Commons（CC0 / CC BY*），本地托管于 public/audio/ */
export const CHANTS: ChantTrack[] = [
  {
    id: 'lingyin',
    labelZh: '灵隐寺 · 僧众梵呗',
    labelEn: 'Lingyin Temple · Monks’ Chanting',
    file: '/audio/chant-lingyin.ogg',
    page: 'https://commons.wikimedia.org/wiki/File:Chanting_at_Lingyin_Temple,_Hangzhou.ogg',
    author: 'LouiseBrown1981',
    license: 'CC BY-SA 3.0',
  },
  {
    id: 'guanyin',
    labelZh: '南无观世音菩萨 · 圣号',
    labelEn: 'Namo Guanshiyin Bodhisattva',
    file: '/audio/chant-guanyin.ogg',
    page: 'https://commons.wikimedia.org/wiki/File:Avalokiteśvara.ogg',
    author: 'Bshong0520',
    license: 'CC BY-SA 3.0',
  },
  {
    id: 'heartsutra',
    labelZh: '般若波罗蜜多心经 · 念诵',
    labelEn: 'Heart Sutra · Mandarin Recitation',
    file: '/audio/chant-heartsutra.ogg',
    page: 'https://commons.wikimedia.org/wiki/File:Bore_Xinjing_般若心经_(Heart_Sutra)_in_Mandarin_recited_by_a_Chinese_Buddhist_layperson.ogg',
    author: 'Nyarlathotep1001',
    license: 'CC0',
  },
  {
    id: 'mani',
    labelZh: '六字大明咒 · 定觉寺',
    labelEn: 'Om Mani Padme Hum · Dingjue Temple',
    file: '/audio/chant-mani.ogg',
    page: 'https://commons.wikimedia.org/wiki/File:20260602_145937_Dingjue_Om_mani_padme_hum.ogg',
    author: 'Saimmx',
    license: 'CC0',
  },
]

/** 梵钟实录（日本滋贺县长命寺），撞钟默认音源；加载失败时回退 Web Audio 合成 */
export const BELL_TRACK = {
  file: '/audio/bell-chomeiji.ogg',
  page: 'https://commons.wikimedia.org/wiki/File:Bonsyou5599.ogg',
  author: 'Jnn',
  license: 'CC BY 2.1 JP',
}
