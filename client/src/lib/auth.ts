export function getVoterToken(): string {
  let token = localStorage.getItem('voter_token');
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem('voter_token', token);
  }
  return token;
}

export function getAuthorName(): string {
  return localStorage.getItem('author_name') || '';
}

export function setAuthorName(name: string) {
  localStorage.setItem('author_name', name);
}
