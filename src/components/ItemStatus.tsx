import type { PullRequestInfo, IssueInfo } from '../hooks/useGithubData';

interface ItemStatusProps {
  item: PullRequestInfo | IssueInfo;
}

export function ItemStatus({ item }: ItemStatusProps) {
  let backgroundColor = '';
  let text = '';

  if ('pull_request' in item || 'merged_at' in item) {
    const pr = item as PullRequestInfo;
    if (pr.merged_at) { backgroundColor = '#6f42c1'; text = 'Merged'; }
    // --- CAMBIO: Se eliminó la lógica para 'draft' ---
    else if (pr.state === 'open') { backgroundColor = '#2cbe4e'; text = 'Open'; }
    else { backgroundColor = '#cb2431'; text = 'Closed'; }
  } else {
    // Es un Issue
    if (item.state === 'open') { backgroundColor = '#2cbe4e'; text = 'Open'; }
    else { backgroundColor = '#cb2431'; text = 'Closed'; }
  }

  const style = {
    display: 'inline-block', padding: '2px 8px', marginLeft: '8px',
    borderRadius: '12px', fontSize: '0.75em', fontWeight: 'bold',
    color: 'white', textTransform: 'capitalize' as 'capitalize', backgroundColor,
  };
  return <span style={style}>{text}</span>;
};

