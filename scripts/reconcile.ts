import { db } from '../lib/db';
import { maintenance } from '../lib/maintenance';
maintenance()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    if (result.reconciliation.deferred) process.exitCode = 1;
  })
  .catch(() => {
    console.error(
      'Maintenance failed. Verify private environment configuration and database connectivity.',
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
