import { defineBackend } from '@aws-amplify/backend';
import { storage } from '@aws-amplify/backend/storage';

const backend = defineBackend({
  storage: storage({
    name: 'er-website-results',
    access: {
      // Authenticated users only
      'authenticated': ['read', 'write', 'delete'],
    },
  }),
});

export default backend;