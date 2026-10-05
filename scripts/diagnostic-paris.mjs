import fs from 'node:fs';
import { Store } from '../server/paris/storage.mjs';
import { Collector, registry } from '../server/paris/collector.mjs';
const store = new Store();
const collector = new Collector(store);
await collector.cycle();
for (const s of registry) {
  const state = collector.status(s),
    snap = store.get('source:' + s.id);
  console.log(
    JSON.stringify({
      id: s.id,
      integration: state.integration,
      state: state.state,
      current: state.count,
      retained: snap?.features?.length ?? null,
      lastSuccess: state.lastSuccess,
      error: state.error,
    }),
  );
  if (
    process.argv.includes('--evidence') &&
    snap?.lastSuccess &&
    !snap.errorState
  ) {
    const proof = {
      id: s.id,
      producer: s.producer,
      source: s.source,
      license: state.license,
      ...snap.evidence[0],
      currentParisCount: state.count,
      state: state.state,
    };
    fs.mkdirSync('docs/evidence', { recursive: true });
    fs.writeFileSync(
      'docs/evidence/' + s.id + '.json',
      JSON.stringify(proof, null, 2) + '\n',
    );
    s.integration = 'verified';
    s.evidence = [
      {
        testedAt: proof.testedAt,
        file: 'docs/evidence/' + s.id + '.json',
        state: state.state,
      },
    ];
  }
}
if (process.argv.includes('--evidence'))
  fs.writeFileSync(
    'config/paris-sources.json',
    JSON.stringify(registry, null, 2) + '\n',
  );
const failed = registry.filter(
  (s) =>
    s.enabled &&
    collector.configured(s) &&
    collector.status(s).state === 'failure',
);
store.close();
process.exitCode = failed.length ? 1 : 0;
