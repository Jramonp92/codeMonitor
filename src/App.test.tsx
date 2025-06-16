import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import { useGithubData } from './hooks/useGithubData';

// Mock the entire hook to have full control over the data App receives.
jest.mock('./hooks/useGithubData');

const mockedUseGithubData = useGithubData as jest.Mock;

// --- MOCK DATA ---
const mockUser = { login: 'testuser', avatar_url: 'http://example.com/avatar.png' };
const mockRepos = [{ id: 1, name: 'repo-1', full_name: 'testuser/repo-1', private: false, owner: { login: 'testuser' } }];
const mockCommits = Array.from({ length: 7 }, (_, i) => ({
  sha: `sha_${i}`,
  commit: { author: { name: 'Author Name', date: new Date().toISOString() }, message: `Commit message ${i}` },
  html_url: `http://example.com/commit/${i}`,
}));

describe('App Component', () => {

  test('renders login button when not authenticated', () => {
    // Simulate the "not logged in" state.
    mockedUseGithubData.mockReturnValue({
      user: null,
    });
    render(<App />);
    expect(screen.getByText(/Iniciar Sesión con GitHub/i)).toBeInTheDocument();
  });

  describe('when authenticated', () => {
    // These are the mock functions that will simulate user actions.
    const mockSetSelectedRepo = jest.fn();
    const mockSetActiveTab = jest.fn();
    const mockSetCurrentPage = jest.fn();

    beforeEach(() => {
      // Before each test, reset the mock with a common initial state.
      mockedUseGithubData.mockReturnValue({
        user: mockUser,
        allRepos: mockRepos,
        managedRepos: mockRepos, // Important: Provide repos so the dropdown is not empty.
        selectedRepo: '', // Start with no repo selected.
        isContentLoading: false,
        activeTab: 'Commits',
        commits: [], // Start with empty content.
        issues: [],
        pullRequests: [],
        actions: [],
        releases: [],
        currentPage: 1,
        totalPages: 1,
        // Mocked functions to check if they are called.
        setSelectedRepo: mockSetSelectedRepo,
        setActiveTab: mockSetActiveTab,
        setCurrentPage: mockSetCurrentPage,
        addRepoToManagedList: jest.fn(),
        removeRepoFromManagedList: jest.fn(),
        setIssueStateFilter: jest.fn(),
        setPrStateFilter: jest.fn(),
        setActionStatusFilter: jest.fn(),
      });
    });

    test('renders header and allows selecting a repository', async () => {
      render(<App />);
      
      expect(await screen.findByText(`¡Bienvenido, ${mockUser.login}!`)).toBeInTheDocument();
      
      // 1. Click the input to open the dropdown list.
      fireEvent.click(screen.getByPlaceholderText('Select a repository'));

      // 2. Find and click the repository option in the list.
      const repoOption = await screen.findByText('repo-1');
      fireEvent.click(repoOption);

      // 3. Verify that the functions to update the state were called correctly.
      // This is the key test to prove the interaction works!
      expect(mockSetSelectedRepo).toHaveBeenCalledWith('testuser/repo-1');
      expect(mockSetActiveTab).toHaveBeenCalledWith('Commits');
      expect(mockSetCurrentPage).toHaveBeenCalledWith(1);
    });

    test('renders content after a repository is selected', async () => {
      // For this test, we simulate that a repo has ALREADY been selected.
      mockedUseGithubData.mockReturnValue({
        ...mockedUseGithubData(), // Reuse the base mock...
        selectedRepo: 'testuser/repo-1', // ...BUT with a selected repo...
        isContentLoading: false,
        commits: mockCommits, // ...and with commit data.
      });

      render(<App />);

      // Now the app renders in the "repo selected" state,
      // and we can find the elements that depend on it.
      expect(await screen.findByText('Commits')).toBeInTheDocument();
      expect(screen.queryByText(/No se encontraron datos/i)).not.toBeInTheDocument();
      expect(await screen.findAllByRole('listitem')).toHaveLength(7);
      expect(await screen.findByTitle('Refrescar datos')).toBeInTheDocument();
    });
  });
});