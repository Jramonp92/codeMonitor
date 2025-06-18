import './ItemStatus.css'; // 1. Importamos el nuevo CSS
import type { PullRequestInfo, IssueInfo } from '../hooks/useGithubData';

interface ItemStatusProps {
  item: PullRequestInfo | IssueInfo;
}

export function ItemStatus({ item }: ItemStatusProps) {
  let backgroundColor = '';
  let text = '';

  if ('pull_request' in item || 'merged_at' in item) {
    const pr = item as PullRequestInfo;
    if (pr.merged_at) {
      backgroundColor = '#6f42c1'; // Merged
      text = 'Merged';
    } else if (pr.state === 'open') {
      backgroundColor = '#2cbe4e'; // Open
      text = 'Open';
    } else {
      backgroundColor = '#cb2431'; // Closed
      text = 'Closed';
    }
  } else {
    // Es un Issue
    if (item.state === 'open') {
      backgroundColor = '#2cbe4e'; // Open
      text = 'Open';
    } else {
      backgroundColor = '#cb2431'; // Closed
      text = 'Closed';
    }
  }

  // 2. El objeto de estilo ahora solo contiene el color de fondo dinámico
  const style = { backgroundColor };
  
  // 3. El span ahora usa la clase CSS y el estilo inline para el color
  return <span className="item-status-pill" style={style}>{text}</span>;
}