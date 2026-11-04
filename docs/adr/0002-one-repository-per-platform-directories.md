# One repository with one directory per platform and a shared core

All platforms live in one repository: `core/` holds the shared calculations, and each desktop has its own top-level directory (`gnome/` now, `kde/` and `windows/` later). One change to a calculation then reaches every platform in one commit, and the platform directories stay thin.
