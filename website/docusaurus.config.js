// @ts-check

const lightCodeTheme = require('prism-react-renderer').themes.github;
const darkCodeTheme = require('prism-react-renderer').themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Stakkr',
  tagline:
    'On-prem KVM lab scaffold for OpenShift bring-up, VM bootstrap, and host resource management on one libvirt host.',
  favicon: 'img/stakkr-favicon.svg',

  url: 'https://turbra.github.io',
  baseUrl: '/stakkr/',
  organizationName: 'turbra',
  projectName: 'stakkr',
  trailingSlash: true,

  onBrokenLinks: 'throw',
  markdown: {
    mermaid: true,
    format: 'detect',
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/turbra/stakkr/edit/main/website/docs/',
          showLastUpdateAuthor: false,
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/stakkr-favicon.svg',
      navbar: {
        title: 'Stakkr',
        logo: {
          alt: 'Stakkr',
          src: 'img/stakkr-favicon.svg',
        },
        items: [
          {to: '/', label: 'Docs', position: 'left'},
          {to: '/getting-started/first-host-policy', label: 'Getting Started', position: 'left'},
          {to: '/examples', label: 'Examples', position: 'left'},
          {to: '/reference/host-resource-management', label: 'Reference', position: 'left'},
          {
            href: 'https://github.com/turbra/stakkr',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'light',
        links: [
          {
            title: 'Docs',
            items: [
              {label: 'Getting Started', to: '/getting-started/first-host-policy'},
              {label: 'Prerequisites', to: '/prerequisites'},
              {label: 'Concepts', to: '/concepts/overview'},
              {label: 'Examples', to: '/examples'},
            ],
          },
          {
            title: 'Workflows',
            items: [
              {label: 'OpenShift SNO', to: '/openshift-sno-cluster'},
              {label: 'OpenShift compact', to: '/openshift-compact-cluster'},
              {label: 'RHEL 10 bootstrap', to: '/rhel10-vm-bootstrap'},
            ],
          },
          {
            title: 'Project',
            items: [
              {label: 'Repository', href: 'https://github.com/turbra/stakkr'},
              {label: 'Issues', href: 'https://github.com/turbra/stakkr/issues'},
              {label: 'License', href: 'https://github.com/turbra/stakkr/blob/main/LICENSE'},
              {label: 'GitHub Pages', to: '/reference/github-pages'},
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Stakkr contributors.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: ['bash', 'diff', 'json', 'powershell', 'yaml'],
      },
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 3,
      },
    }),
};

module.exports = config;
