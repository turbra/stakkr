Name:           cockpit-stakkr-observer
Version:        1.2.3
Release:        1%{?dist}
Summary:        Cockpit plugin for Stakkr hypervisor performance domain and memory oversubscription observability

License:        GPL-3.0-or-later
URL:            https://github.com/turbra/stakkr
Source0:        %{name}-%{version}.tar.gz

BuildArch:      noarch
BuildRequires:  systemd-rpm-macros

Requires:       cockpit-system
Requires:       cockpit-bridge
Requires:       python3
Requires:       libvirt-client
Requires:       firewalld
Requires(post): systemd
Requires(preun): systemd
Requires(postun): systemd

%description
Stakkr Observer is a Cockpit plugin that provides real-time observability
into CPU performance domains (Gold/Silver/Bronze systemd cgroup tiers) and
host memory oversubscription features (KSM, zram, THP) on KVM hypervisors
running the Stakkr on-prem lab.

The plugin displays:
- KSM cost-benefit analysis with efficiency verdict and tuning recommendations
- Per-tier and per-domain CPU utilization with throttling indicators
- Host memory waterfall with overcommit ratio and reclaim gains
- Memory management overhead tracking (ksmd, kswapd, kcompactd CPU cost)

%prep
%autosetup

%build
# Nothing to build — pure HTML/JS/CSS/Python plugin

%install
mkdir -p %{buildroot}%{_datadir}/cockpit/stakkr-observer
mkdir -p %{buildroot}%{_unitdir}
mkdir -p %{buildroot}%{_tmpfilesdir}
mkdir -p %{buildroot}%{_sysconfdir}/calabi-observer
install -m 0644 manifest.json          %{buildroot}%{_datadir}/cockpit/stakkr-observer/
install -m 0644 index.html             %{buildroot}%{_datadir}/cockpit/stakkr-observer/
install -m 0644 calabi-observer.js     %{buildroot}%{_datadir}/cockpit/stakkr-observer/
install -m 0644 calabi-observer.css    %{buildroot}%{_datadir}/cockpit/stakkr-observer/
install -m 0755 collector.py           %{buildroot}%{_datadir}/cockpit/stakkr-observer/
install -m 0755 calabi_exporter.py     %{buildroot}%{_datadir}/cockpit/stakkr-observer/
install -m 0755 prometheus_exporter.py %{buildroot}%{_datadir}/cockpit/stakkr-observer/
install -m 0755 prometheus_control.py  %{buildroot}%{_datadir}/cockpit/stakkr-observer/
install -m 0644 README.md              %{buildroot}%{_datadir}/cockpit/stakkr-observer/
install -m 0644 INTERPRETING.md        %{buildroot}%{_datadir}/cockpit/stakkr-observer/
mkdir -p %{buildroot}%{_datadir}/cockpit/stakkr-observer/images
cp -a images/. %{buildroot}%{_datadir}/cockpit/stakkr-observer/images/
install -m 0644 prometheus.json %{buildroot}%{_sysconfdir}/calabi-observer/prometheus.json
install -m 0644 calabi-exporter.service      %{buildroot}%{_unitdir}/
install -m 0644 calabi-node-exporter.service %{buildroot}%{_unitdir}/
install -m 0644 calabi-observer-prometheus.tmpfiles %{buildroot}%{_tmpfilesdir}/calabi-observer-prometheus.conf

%post
/usr/bin/systemd-tmpfiles --create %{_tmpfilesdir}/calabi-observer-prometheus.conf || :
%systemd_post calabi-exporter.service calabi-node-exporter.service

%preun
%systemd_preun calabi-exporter.service calabi-node-exporter.service

%postun
%systemd_postun_with_restart calabi-exporter.service calabi-node-exporter.service

%files
%{_datadir}/cockpit/stakkr-observer/
%{_unitdir}/calabi-exporter.service
%{_unitdir}/calabi-node-exporter.service
%{_tmpfilesdir}/calabi-observer-prometheus.conf
%config(noreplace) %{_sysconfdir}/calabi-observer/prometheus.json

%changelog
* Mon Apr 27 2026 turbra <brydenstack@gmail.com> - 1.2.3-1
- Sync with calabi-observer v1.2.3; package calabi files under stakkr-observer Cockpit plugin
- Radial arc gauges on key percentage/ratio metrics
- Frosted glass aesthetic with light/dark mode support
- Add persistent calabi-exporter.service daemon with two-speed collection
- Add Prometheus metrics export on :9910 (calabi_* metric prefix)
- Add CPU Pool Topology heatmap with NUMA domain boxing
- Add ECC (Effective Constrained Clock) sub-tab with per-tier SLO floors
- Add vCPU oversubscription ratio and host steal time metrics
- UX refactor: tabbed CPU/Memory/Configuration layout
- Disposition strips replace verdict gauges
- ARIA tab roles for accessibility
- Preserve LEGACY_VM_TIERS fallback for Stakkr kvm-worker-* domains

* Tue Mar 25 2025 turbra <brydenstack@gmail.com> - 1.0.0-1
- Initial release
