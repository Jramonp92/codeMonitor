// src/components/ItemStatus.tsx

import { useTranslation } from 'react-i18next'; // 1. Importar hook
import './ItemStatus.css';
import type { PullRequestInfo, IssueInfo } from '../hooks/useGithubData';

interface ItemStatusProps {
  item: PullRequestInfo | IssueInfo;
}

export function ItemStatus({ item }: ItemStatusProps) {
  const { t } = useTranslation(); // 2. Usar hook
  let statusClassName = '';
  let text = '';

  if ('pull_request' in item || 'merged_at' in item) {
    const pr = item as PullRequestInfo;
    if (pr.merged_at) {
      statusClassName = 'status-merged';
      text = t('statusMerged');
    } else if (pr.state === 'open') {
      statusClassName = 'status-open';
      text = t('statusOpen');
    } else {
      statusClassName = 'status-closed';
      text = t('statusClosed');
    }
  } else {
    if (item.state === 'open') {
      statusClassName = 'status-open';
      text = t('statusOpen');
    } else {
      statusClassName = 'status-closed';
      text = t('statusClosed');
    }
  }

  return <span className={`item-status-pill ${statusClassName}`}>{text}</span>;
}