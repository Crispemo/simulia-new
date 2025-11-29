module.exports = function override(config, env) {
  // Mejorar la resolución de módulos para ESM
  // Esto permite que webpack resuelva módulos sin extensiones explícitas
  config.resolve = {
    ...config.resolve,
    extensions: [...(config.resolve.extensions || []), '.mjs'],
    fullySpecified: false
  };

  // Si hay fallbacks configurados, mantenerlos
  if (config.resolve.fallback) {
    config.resolve.fallback = {
      ...config.resolve.fallback
    };
  }

  return config;
};

