const scriptPromises = new Map();
const stylesheetPromises = new Map();

function absoluteUrl(url) {
  return new URL(url, window.location.href).toString();
}

export function loadScript(url) {
  const resolved = absoluteUrl(url);
  if (scriptPromises.has(resolved)) {
    return scriptPromises.get(resolved);
  }

  const promise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${resolved}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve(existing);
        return;
      }

      existing.addEventListener('load', () => resolve(existing), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load script: ${url}`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = resolved;
    script.async = false;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve(script);
    };
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });

  scriptPromises.set(resolved, promise);
  return promise;
}

export function loadStylesheet(url) {
  const resolved = absoluteUrl(url);
  if (stylesheetPromises.has(resolved)) {
    return stylesheetPromises.get(resolved);
  }

  const promise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`link[href="${resolved}"]`);
    if (existing) {
      resolve(existing);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = resolved;
    link.onload = () => resolve(link);
    link.onerror = () => reject(new Error(`Failed to load stylesheet: ${url}`));
    document.head.appendChild(link);
  });

  stylesheetPromises.set(resolved, promise);
  return promise;
}
