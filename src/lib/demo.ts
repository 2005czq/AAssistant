import type { Bill, Lang } from './types';

export function getDemoData(lang: Lang): { members: string[]; bills: Bill[] } {
  if (lang === 'zh') {
    return {
      members: ['崔芷琪', '温慧雯', '聂梦冉', '刘苏珍'],
      bills: [
        {
          id: 1,
          payer: '崔芷琪',
          reason: '火锅',
          type: 'Join',
          amount: 139,
          involved: ['崔芷琪', '温慧雯', '聂梦冉'],
          distribution: {},
          ratios: {}
        },
        {
          id: 2,
          payer: '温慧雯',
          reason: '甜点',
          type: 'Distribution',
          amount: 33,
          involved: [],
          distribution: { '崔芷琪': 15, '温慧雯': 18, '聂梦冉': 0, '刘苏珍': 0 },
          ratios: {}
        },
        {
          id: 3,
          payer: '聂梦冉',
          reason: '网约车',
          type: 'AA',
          amount: 17.72,
          involved: [],
          distribution: {},
          ratios: {}
        },
        {
          id: 4,
          payer: '温慧雯',
          reason: '饮品',
          type: 'Remove',
          amount: 25.8,
          involved: ['聂梦冉'],
          distribution: {},
          ratios: {}
        },
        {
          id: 5,
          payer: '刘苏珍',
          reason: '烧烤',
          type: 'Ratio',
          amount: 200,
          involved: [],
          distribution: {},
          ratios: { '崔芷琪': 1, '温慧雯': 2, '聂梦冉': 1, '刘苏珍': 1 }
        }
      ]
    };
  }

  return {
    members: ['Alice', 'Bob', 'Charlie', 'David'],
    bills: [
      {
        id: 1,
        payer: 'Alice',
        reason: 'Hotpot',
        type: 'Join',
        amount: 139,
        involved: ['Alice', 'Bob', 'Charlie'],
        distribution: {},
        ratios: {}
      },
      {
        id: 2,
        payer: 'Bob',
        reason: 'Dessert',
        type: 'Distribution',
        amount: 33,
        involved: [],
        distribution: { Alice: 15, Bob: 18, Charlie: 0, David: 0 },
        ratios: {}
      },
      {
        id: 3,
        payer: 'Charlie',
        reason: 'Taxi',
        type: 'AA',
        amount: 17.72,
        involved: [],
        distribution: {},
        ratios: {}
      },
      {
        id: 4,
        payer: 'Bob',
        reason: 'Drinks',
        type: 'Remove',
        amount: 25.8,
        involved: ['Charlie'],
        distribution: {},
        ratios: {}
      },
      {
        id: 5,
        payer: 'David',
        reason: 'Barbecue',
        type: 'Ratio',
        amount: 200,
        involved: [],
        distribution: {},
        ratios: { Alice: 1, Bob: 2, Charlie: 1, David: 1 }
      }
    ]
  };
}
