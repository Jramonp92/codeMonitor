import './ItemStatus.css';
import type { PullRequestInfo, IssueInfo } from '../hooks/useGithubData';

interface ItemStatusProps {
  item: PullRequestInfo | IssueInfo;
}

export function ItemStatus({ item }: ItemStatusProps) {
  // CAMBIO: En lugar de un color, ahora determinamos una clase de estado
  let statusClassName = '';
  let text = '';

  if ('pull_request' in item || 'merged_at' in item) {
    const pr = item as PullRequestInfo;
    if (pr.merged_at) {
      statusClassName = 'status-merged';
      text = 'Merged';
    } else if (pr.state === 'open') {
      statusClassName = 'status-open';
      text = 'Open';
    } else {
      statusClassName = 'status-closed';
      text = 'Closed';
    }
  } else {
    if (item.state === 'open') {
      statusClassName = 'status-open';
      text = 'Open';
    } else {
      statusClassName = 'status-closed';
      text = 'Closed';
    }
  }

  // CAMBIO: Aplicamos la clase de estado al span, en lugar de un estilo en línea
  return <span className={`item-status-pill ${statusClassName}`}>{text}</span>;
}