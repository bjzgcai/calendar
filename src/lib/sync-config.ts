// Shared sync configuration — safe to import in both server and client code

export const SYNC_USER_NAMES: Record<string, string> = {
  "Qfr1meiPqooG1l2jyZ5zOyQiEiE": "钟泱榆",
  "e5JiPXxELQAEoNpZ50qLsnwiEiE": "杨阳",
  "IgQRc4KPdJXQiPPBOEl3biiQiEiE": "曹丽娜",
  "PBthSFmpvl88mPnwOMPPegiEiE": "李彤",
  "KiitOBaSpDbrfI9Shm1N3WQiEiE": "祁冰琪",
  "9eKdzn6GiSwftxR9mzScnQAiEiE": "王海宁",
  "XpM6u0e93oVRDJL5OUdXwAiEiE": "王雪菲",
  "XC1PoBo8vc5yrA14AaXPRQiEiE": "王一琳",
  "zVviPOyJX8KgT19d1uDtoeAiEiE": "王奕莹",
  "y3JEW99o59fZnpVM0mFeNwiEiE": "吴婧怡",
  "FB1TAojoMNJrKXho3wOgiSAiEiE": "姚宇",
  "RiSHHIxiPhJzKBcOezTJT3hAiEiE": "张诣璇",
  "eOsXBNqffPs8mPnwOMPPegiEiE": "郑稀文",
  "w94Km8dCRiShQHqH3GhvApAiEiE": "戴平",
  "CEpyopPFyvpvpK4CxuNAAwiEiE": "董璐",
  "Axu9OPuNnp5RDJL5OUdXwAiEiE": "贾远",
  "wWEZG688mfbq1fQFg5sS7AiEiE": "郭慧",
  "2Tb1JxHMqt2pGUk1hCYniSAiEiE": "郭倩倩",
  "UqSl7nduFzQuiSqMxiPm9iPwQiEiE": "李芳",
  "tpiPJvvnhcOBojaoeXrtk8QiEiE": "李雅鹏",
  "gbUTqwO01YEoNpZ50qLsnwiEiE": "马旭敏",
  "F080ftHeY1quLk6NjNuzXgiEiE": "任晓明",
  "Cebii2IMOH2y47iSK4Bm7iiZQiEiE": "滕兴",
  "4CHLzV4PB99sVqcwt6NCYQiEiE": "田心原",
  "4BmNXB3SwUzmKz8njfjUAQiEiE": "王溶",
  "RiSHHIxiPhJzLsPdsD0TWftwiEiE": "刘莎",
  "T5SzHB8rQT7lGy8XXJKbIwiEiE": "刘泊伽",
  "iPS9rPkfIPhUtlhYZsrNKXgiEiE": "邓梅",
  "8QGN0AHiPXXTQiPPBOEl3biiQiEiE": "柏俞阳",
  "DBiiTiPV1gPf0giivvYd1MwfwiEiE": "张玉",
  "FL9UUOj7qUR9RXIR06nY7QiEiE": "官昊",
  "g8m91sJO3rmniPNiSnwiiIjWgiEiE": "林姝婕",
  "Xg2wCQDpA1xRxOIYLVuiiiSwiEiE": "邢宇",
  "vbuuZTVsYJ5iSKMHiifkUDmQiEiE": "周敏",
  "mmIii5g2ii1Kj6RuHiPf63HggiEiE": "何萌",
  "m2gUIXiPP2GVCpriSAOXNbhwiEiE": "吕晔"
}


export const SYNC_USER_IDS = Object.keys(SYNC_USER_NAMES)

export const SYNC_USER_DISPLAY_NAMES = SYNC_USER_IDS
  .map((id) => SYNC_USER_NAMES[id] ?? id)
  .join("\\")
