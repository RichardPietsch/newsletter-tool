import packageMetadata from '@/package.json';

const gitRevisionPattern = /^[0-9a-f]{7,40}$/i;

function repositoryUrl() {
  const configuredUrl = packageMetadata.repository.url;
  return configuredUrl.endsWith('.git') ? configuredUrl.slice(0, -4) : configuredUrl;
}

export function resolveBuildInfo(environment: NodeJS.ProcessEnv = process.env) {
  const sourceUrl = repositoryUrl();
  const configuredRevision = environment.APP_BUILD_SHA?.trim() ?? '';
  const hasGitRevision = gitRevisionPattern.test(configuredRevision);
  const buildId = hasGitRevision
    ? configuredRevision.slice(0, 12).toLowerCase()
    : environment.NODE_ENV === 'production'
      ? 'unbekannt'
      : 'development';

  return {
    version: packageMetadata.version,
    buildId,
    commitUrl: hasGitRevision ? `${sourceUrl}/commit/${configuredRevision}` : null,
    compareUrl: hasGitRevision ? `${sourceUrl}/compare/${configuredRevision}...main` : null,
    sourceUrl,
  };
}
