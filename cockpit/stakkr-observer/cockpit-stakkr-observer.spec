Name:           cockpit-stakkr-observer
Version:        1.0.0
Release:        1%{?dist}
Summary:        Cockpit plugin for Stakkr host resource observability

License:        GPL-3.0-or-later
URL:            https://github.com/turbra/stakkr
Source0:        %{name}-%{version}.tar.gz

BuildArch:      noarch

Requires:       cockpit-system
Requires:       cockpit-bridge
Requires:       python3
Requires:       libvirt-client

%description
Stakkr Observer is a Cockpit plugin that provides real-time observability into
the Stakkr host resource model on KVM hypervisors.

The plugin displays:
- current host state: stock, shared execution pool, clock-tiering, or mixed
- live Gold/Silver/Bronze scope weights and VM pinning
- CPU pool topology with live utilization and frequency
- host memory state for KSM, THP, zram, and swap
- memory-management kernel thread CPU overhead

%prep
%autosetup

%build
# Nothing to build - pure HTML/JS/CSS/Python plugin

%install
mkdir -p %{buildroot}%{_datadir}/cockpit/stakkr-observer
install -m 0644 manifest.json %{buildroot}%{_datadir}/cockpit/stakkr-observer/
install -m 0644 index.html %{buildroot}%{_datadir}/cockpit/stakkr-observer/
install -m 0644 stakkr-observer.js %{buildroot}%{_datadir}/cockpit/stakkr-observer/
install -m 0644 stakkr-observer.css %{buildroot}%{_datadir}/cockpit/stakkr-observer/
install -m 0644 sparkline.js %{buildroot}%{_datadir}/cockpit/stakkr-observer/
install -m 0755 collector.py %{buildroot}%{_datadir}/cockpit/stakkr-observer/
install -m 0644 README.md %{buildroot}%{_datadir}/cockpit/stakkr-observer/
install -m 0644 INTERPRETING.md %{buildroot}%{_datadir}/cockpit/stakkr-observer/
mkdir -p %{buildroot}%{_datadir}/cockpit/stakkr-observer/images
cp -a images/. %{buildroot}%{_datadir}/cockpit/stakkr-observer/images/

%files
%{_datadir}/cockpit/stakkr-observer/
