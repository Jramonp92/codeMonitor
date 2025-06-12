// --- Ruta: src/components/ItemStatus.tsx ---
import React from 'react';
// --- CORRECCIÓN: La ruta de importación ahora apunta al custom hook ---
import type { IssueInfo, PullRequestInfo } from '../hooks/useGithubData';

export const ItemStatus: React.FC<{ item: IssueInfo | PullRequestInfo }> = ({ item }) => {
  let backgroundColor = '';
  let text = '';
  const isPR = 'draft' in item;

  if (isPR) {
    const pr = item as PullRequestInfo;
    if (pr.merged_at) { backgroundColor = '#6f42c1'; text = 'Merged'; } 
    else if (pr.draft) { backgroundColor = '#6a737d'; text = 'Draft'; } 
    else if (pr.state === 'open') { backgroundColor = '#28a745'; text = 'Open'; } 
    else { backgroundColor = '#d73a49'; text = 'Closed'; }
  } else {
    backgroundColor = item.state === 'open' ? '#28a745' : '#d73a49';
    text = item.state;
  }

  const style = {
    display: 'inline-block', padding: '2px 8px', marginLeft: '8px',
    borderRadius: '12px', fontSize: '0.75em', fontWeight: 'bold',
    color: 'white', textTransform: 'capitalize' as 'capitalize', backgroundColor,
  };
  return <span style={style}>{text}</span>;
};
