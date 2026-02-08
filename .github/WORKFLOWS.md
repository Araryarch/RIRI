# GitHub Workflows Documentation

## Workflows

### 1. CI Workflow (`ci.yml`)
**Trigger:** Push to main/master/develop branches, or Pull Requests

**Jobs:**
- **Test**: Runs on Ubuntu, macOS, and Windows
  - Installs dependencies
  - Runs linter (if available)
  - Runs all tests
  - Builds the project

- **Build Binaries**: Runs after tests pass (main branch only)
  - Creates standalone Linux binary
  - Uploads as artifact

**Usage:**
- Automatically runs on every push/PR
- Ensures code quality across platforms
- Catches issues early

### 2. Release Workflow (`release.yml`)
**Trigger:** Push tags matching `v*` (e.g., `v1.0.0`)

**Jobs:**
- **Build**: Creates release binaries for all platforms
  - Linux x64
  - Windows x64
  - macOS x64
  - macOS ARM64 (Apple Silicon)

**Usage:**
```bash
# Create a release
git tag v1.0.0
git push origin v1.0.0

# This will:
# 1. Run all tests
# 2. Build binaries for all platforms
# 3. Create GitHub release with binaries attached
```

## Setup Requirements

### Bun Installation
Both workflows use `oven-sh/setup-bun@v2` which:
- Installs latest Bun version
- Works on Linux, macOS, and Windows
- Caches dependencies for faster builds

### Dependencies Caching
Workflows cache Bun dependencies to speed up builds:
```yaml
- name: Cache Bun dependencies
  uses: actions/cache@v4
  with:
    path: ~/.bun/install/cache
    key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lockb') }}
```

## Troubleshooting

### "Bun not found" Error
**Solution:** Updated to `oven-sh/setup-bun@v2` (latest version)

### Slow builds
**Solution:** Added dependency caching

### Test failures
**Solution:** CI runs on multiple platforms to catch platform-specific issues

## Best Practices

1. **Always run tests locally first:**
   ```bash
   bun run src/index.ts test
   ```

2. **Create meaningful commit messages:**
   ```bash
   git commit -m "feat: add ternary operator support"
   ```

3. **Use semantic versioning for releases:**
   - `v1.0.0` - Major release
   - `v1.1.0` - Minor release (new features)
   - `v1.0.1` - Patch release (bug fixes)

4. **Check CI status before merging PRs**

## Workflow Status Badges

Add to README.md:
```markdown
![CI](https://github.com/YOUR_USERNAME/riri-lang/workflows/CI/badge.svg)
![Release](https://github.com/YOUR_USERNAME/riri-lang/workflows/Build%20and%20Release/badge.svg)
```

## Future Improvements

- [ ] Add code coverage reporting
- [ ] Add performance benchmarks
- [ ] Add security scanning
- [ ] Add automatic changelog generation
- [ ] Add Docker image builds
