// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    'home',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'prerequisites',
        'getting-started/first-host-policy',
        'getting-started/first-sno',
        'getting-started/first-observer-check',
      ],
    },
    {
      type: 'category',
      label: 'Concepts',
      collapsed: false,
      items: [
        'concepts/overview',
        'concepts/operating-model',
        'concepts/local-state',
      ],
    },
    {
      type: 'category',
      label: 'Workflows',
      collapsed: false,
      items: [
        'openshift-sno-cluster',
        'openshift-compact-cluster',
        'rhel10-vm-bootstrap',
        'idm-local-bootstrap',
        'stakkr-observer',
        'shared-execution-pool-performance-domains',
        'shared-execution-pool-validation',
        'clock-frequency-tiering',
        'clock-frequency-validation',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: false,
      items: [
        'reference/host-resource-management',
        'reference/playbooks',
        'reference/configuration',
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      collapsed: false,
      items: ['examples/index'],
    },
    {
      type: 'category',
      label: 'Project',
      collapsed: false,
      items: ['documentation-map', 'reference/github-pages'],
    },
  ],
};

module.exports = sidebars;
