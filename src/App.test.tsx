import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import App from './App';

// --- MOCK DATA ---
const mockUser = { login: 'testuser', avatar_url: 'http://example.com/avatar.png' };
const mockRepos = [{ id: 1, name: 'repo-1', full_name: 'testuser/repo-1' }];

const mockCommits = Array.from({ length: 5 }, (_, i) => ({
  sha: `sha_${i}`,
  commit: { author: { name: 'Author Name' }, message: `Commit message ${i}` },
  html_url: `http://example.com/commit/${i}`,
}));

const mockIssues = [
  // 3 Abiertos (1 asignado)
  { id: 1, title: 'Open issue 1', state: 'open', assignees: [{ login: 'assignee1', avatar_url: 'http://example.com/assignee.png', html_url: '' }], user: { login: 'creator', avatar_url: '', html_url: '' }, number: 1, html_url: '' },
  { id: 2, title: 'Open issue 2', state: 'open', assignees: [], user: { login: 'creator', avatar_url: '', html_url: '' }, number: 2, html_url: '' },
  { id: 3, title: 'Open issue 3', state: 'open', assignees: [], user: { login: 'creator', avatar_url: '', html_url: '' }, number: 3, html_url: '' },
  // 2 Cerrados
  { id: 4, title: 'Closed issue 1', state: 'closed', assignees: [], user: { login: 'creator', avatar_url: '', html_url: '' }, number: 4, html_url: '' },
  { id: 5, title: 'Closed issue 2', state: 'closed', assignees: [], user: { login: 'creator', avatar_url: '', html_url: '' }, number: 5, html_url: '' },
];

const mockPRs = [
  // 1 Abierto
  { id: 101, title: 'Open PR 1', state: 'open', draft: false, merged_at: null, assignees: [], user: { login: 'creator', avatar_url: '', html_url: '' }, number: 101, html_url: '' },
  // 3 Mergeados (son un tipo de 'closed')
  { id: 102, title: 'Merged PR 1', state: 'closed', draft: false, merged_at: new Date().toISOString(), assignees: [], user: { login: 'creator', avatar_url: '', html_url: '' }, number: 102, html_url: '' },
  { id: 103, title: 'Merged PR 2', state: 'closed', draft: false, merged_at: new Date().toISOString(), assignees: [], user: { login: 'creator', avatar_url: '', html_url: '' }, number: 103, html_url: '' },
  { id: 104, title: 'Merged PR 3', state: 'closed', draft: false, merged_at: new Date().toISOString(), assignees: [], user: { login: 'creator', avatar_url: '', html_url: '' }, number: 104, html_url: '' },
  // 1 Cerrado (sin merge)
  { id: 105, title: 'Closed PR 1', state: 'closed', draft: false, merged_at: null, assignees: [], user: { login: 'creator', avatar_url: '', html_url: '' }, number: 105, html_url: '' },
];

const mockActions = [
    { id: 201, name: 'Successful Action', status: 'completed', conclusion: 'success', actor: { login: 'actor1' }, pull_requests: [], html_url: '', created_at: '' },
    { id: 202, name: 'Failed Action', status: 'completed', conclusion: 'failure', actor: { login: 'actor2' }, pull_requests: [], html_url: '', created_at: '' },
    { id: 203, name: 'In Progress Action', status: 'in_progress', conclusion: null, actor: { login: 'actor3' }, pull_requests: [], html_url: '', created_at: '' },
    { id: 204, name: 'Queued Action', status: 'queued', conclusion: null, actor: { login: 'actor4' }, pull_requests: [], html_url: '', created_at: '' },
    { id: 205, name: 'Waiting Action', status: 'waiting', conclusion: null, actor: { login: 'actor5' }, pull_requests: [], html_url: '', created_at: '' },
    { id: 206, name: 'Cancelled Action', status: 'completed', conclusion: 'cancelled', actor: { login: 'actor6' }, pull_requests: [], html_url: '', created_at: '' }
];


// Mock de la API de Chrome
beforeAll(() => {
  global.chrome = {
    runtime: {
      sendMessage: jest.fn(),
      getManifest: jest.fn(() => ({
        oauth2: { client_id: 'test_client_id', scopes: ['repo'] },
      })),
    },
    storage: { local: { get: jest.fn(), set: jest.fn(), remove: jest.fn() } }
  } as any;
});

beforeEach(() => {
  (chrome.runtime.sendMessage as jest.Mock).mockClear();
});

test('renders login button when not authenticated', async () => {
  (chrome.runtime.sendMessage as jest.Mock).mockImplementation((message, callback) => {
    if (message.type === 'checkAuthStatus') {
      if (callback) callback({ loggedIn: false });
    }
  });
  render(<App />);
  const loginButton = await screen.findByText(/Iniciar Sesión con GitHub/i);
  expect(loginButton).toBeInTheDocument();
});

// --- SUITE DE TESTS PARA USUARIO LOGUEADO ---
describe('when authenticated', () => {
    beforeEach(() => {
      (chrome.runtime.sendMessage as jest.Mock).mockImplementation((message, callback) => {
        if (!callback) return;
  
        if (message.type === 'checkAuthStatus') {
          callback({ loggedIn: true, user: mockUser });
        } else if (message.type === 'getRepositories') {
          callback({ success: true, repos: mockRepos });
        } else if (message.type === 'getCommits') {
          // CORRECCIÓN: Envolver en 'data' y usar 'items'
          callback({ success: true, data: { items: mockCommits, totalPages: 1 } });
        } else if (message.type === 'getIssues') {
          const state = message.state || 'all';
          const filteredIssues = state === 'all' 
            ? mockIssues 
            : mockIssues.filter(issue => issue.state === state);
          // CORRECCIÓN: Envolver en 'data' y usar 'items'
          callback({ success: true, data: { items: filteredIssues, totalPages: 1 } });
        } else if (message.type === 'getPullRequests') {
            const state = message.state || 'all';
            let prsToReturn;
            if (state === 'all') {
                prsToReturn = mockPRs;
            } else if (message.prStateFilter === 'merged') { // Simular lógica del hook
                prsToReturn = mockPRs.filter(p => p.merged_at !== null);
            } else if (message.prStateFilter === 'closed') { // Simular lógica del hook
                prsToReturn = mockPRs.filter(p => p.state === 'closed' && p.merged_at === null);
            } else {
                 prsToReturn = mockPRs.filter(p => p.state === state && !p.draft);
            }
            // CORRECCIÓN: Envolver en 'data' y usar 'items'
            callback({ success: true, data: { items: prsToReturn, totalPages: 1 } });
        } else if (message.type === 'getActions') {
            const status = message.status || 'all';
            const filteredActions = status === 'all'
                ? mockActions
                : mockActions.filter(action => {
                    if(status === 'success' || status === 'failure' || status === 'cancelled') {
                        return action.conclusion === status;
                    }
                    return action.status === status;
                });
            // CORRECCIÓN: Envolver en 'data' y usar 'items'
            callback({ success: true, data: { items: filteredActions, totalPages: 1 } });
        }
    });
});

  test('renders refresh button', async () => {
    render(<App />);
    await screen.findByTitle(`Refrescar datos`);
  });

  test('renders disconnect button', async () => {
    render(<App />);
    await screen.findByText(`Cerrar Sesión`);
  });

  test('renders 5 items on each tab', async () => {
    render(<App />);
    await screen.findByText(`¡Bienvenido, ${mockUser.login}!`);
    const repoSelector = screen.getByRole('combobox');
    fireEvent.change(repoSelector, { target: { value: 'testuser/repo-1' } });
    
    // Commits
    fireEvent.click(await screen.findByText('Commits'));
    expect(await screen.findAllByRole('listitem')).toHaveLength(5);
    
    // Issues
    fireEvent.click(await screen.findByText('Issues'));
    expect(await screen.findAllByRole('listitem')).toHaveLength(5);
    
    // PRs (con filtro 'all' por defecto)
    fireEvent.click(await screen.findByText('PRs'));
    expect(await screen.findAllByRole('listitem')).toHaveLength(5);
  });

  test('filters issues correctly', async () => {
    render(<App />);
    await screen.findByText(`¡Bienvenido, ${mockUser.login}!`);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'testuser/repo-1' } });

    fireEvent.click(await screen.findByText('Issues'));

    // Filtro All (por defecto)
    expect(await screen.findAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText(/Asignado a:/i)).toBeInTheDocument();
    
    // Filtro Open
    fireEvent.click(screen.getByLabelText('Open'));
    expect(await screen.findAllByRole('listitem')).toHaveLength(3);

    // Filtro Closed
    fireEvent.click(screen.getByLabelText('Closed'));
    expect(await screen.findAllByRole('listitem')).toHaveLength(2);
  });

  test('filters pull requests correctly', async () => {
    render(<App />);
    await screen.findByText(`¡Bienvenido, ${mockUser.login}!`);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'testuser/repo-1' } });

    fireEvent.click(await screen.findByText('PRs'));

    // Filtro All (por defecto)
    expect(await screen.findAllByRole('listitem')).toHaveLength(5);

    // Filtro Merged
    fireEvent.click(screen.getByLabelText('Merged'));
    expect(await screen.findAllByRole('listitem')).toHaveLength(3);

    // Filtro Open (no draft)
    fireEvent.click(screen.getByLabelText('Open'));
    expect(await screen.findAllByRole('listitem')).toHaveLength(1);

    // Filtro Closed (no merged)
    fireEvent.click(screen.getByLabelText('Closed'));
    expect(await screen.findAllByRole('listitem')).toHaveLength(1);
  });

  test('filters actions correctly', async () => {
    render(<App />);
    await screen.findByText(`¡Bienvenido, ${mockUser.login}!`);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'testuser/repo-1' } });
  
    fireEvent.click(await screen.findByText('Actions'));
  
    // Filtro 'Success'
    fireEvent.click(screen.getByLabelText('Success'));
    expect(await screen.findAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText(/Successful Action/i)).toBeInTheDocument();
  
    // Filtro 'Failure'
    fireEvent.click(screen.getByLabelText('Failure'));
    expect(await screen.findAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText(/Failed Action/i)).toBeInTheDocument();
  
    // Filtro 'In Progress'
    fireEvent.click(screen.getByLabelText('In Progress'));
    expect(await screen.findAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText(/In Progress Action/i)).toBeInTheDocument();
  
    // Filtro 'Queued'
    fireEvent.click(screen.getByLabelText('Queued'));
    expect(await screen.findAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText(/Queued Action/i)).toBeInTheDocument();
  
    // Filtro 'Waiting'
    fireEvent.click(screen.getByLabelText('Waiting'));
    expect(await screen.findAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText(/Waiting Action/i)).toBeInTheDocument();

    // Filtro 'Cancelled'
    fireEvent.click(screen.getByLabelText('Cancelled'));
    expect(await screen.findAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText(/Cancelled Action/i)).toBeInTheDocument();
  });
});