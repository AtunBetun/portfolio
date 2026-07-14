export const LIFE_FACTS = [
  { id: 'panama', fact: 'From Panama', wing: 'story', room: null, surface: null },
  { id: 'fsu', fact: 'FSU Computer Science degree', wing: 'story', room: null, surface: null },
  { id: 'cayuco', fact: 'Cayuco ocean race champion', wing: 'story', room: null, surface: null },
  { id: 'powerlifting', fact: 'Competitive powerlifter', wing: 'story', room: null, surface: null },
  { id: 'pg-finance', fact: 'P&G Finance', wing: 'career', room: 'pg', surface: 'panel' },
  {
    id: 'blackstone-swe',
    fact: 'Blackstone SWE',
    wing: 'career',
    room: 'blackstone',
    surface: 'panel'
  },
  { id: 'amazon-swe', fact: 'Amazon SWE', wing: 'career', room: 'amazon', surface: 'panel' },
  { id: 'bodybuilding', fact: 'Bodybuilding', wing: 'passions', room: null, surface: null },
  { id: 'neovim', fact: 'Neovim enthusiast', wing: 'passions', room: null, surface: null },
  { id: 'coffee', fact: 'Coffee aficionado', wing: 'passions', room: null, surface: null },
  { id: 'gaming', fact: 'Gamer', wing: 'passions', room: null, surface: null }
]

export const CAREER_CONTENT = {
  pg: {
    title: 'Procter & Gamble',
    role: 'Finance',
    period: '2018-2019',
    color: '#003DA5',
    achievements: [
      'Financial modeling and analysis for billion-dollar brands',
      'Built automation tools that reduced reporting time by 40%',
      'Cross-functional collaboration with brand teams'
    ]
  },
  blackstone: {
    title: 'Blackstone',
    role: 'Software Engineer',
    period: '2019-2022',
    color: '#1B4D4D',
    achievements: [
      'Built internal tools for portfolio company analysis',
      'Full-stack development (React, Python, AWS)',
      'Automated data pipelines processing millions of records'
    ]
  },
  amazon: {
    title: 'Amazon',
    role: 'Software Engineer',
    period: '2022-Present',
    color: '#FF9900',
    achievements: [
      'Building distributed systems at scale',
      'Designing service architectures for high-throughput workloads',
      'Leading cross-team technical initiatives'
    ]
  }
}
