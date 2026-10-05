document.querySelector('#login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target,
    button = form.querySelector('button'),
    error = document.querySelector('#error');
  button.disabled = true;
  error.textContent = '';
  try {
    const r = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: form.login.value,
        password: form.password.value,
      }),
    });
    if (!r.ok)
      throw Error(
        r.status === 429 ? 'Réessayer plus tard.' : 'Connexion refusée.',
      );
    location.assign('/');
  } catch (e) {
    error.textContent = e.message;
  } finally {
    button.disabled = false;
  }
});
