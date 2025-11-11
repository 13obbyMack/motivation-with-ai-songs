# QuickJS Version Update

## Change Summary

Updated all references to use the official QuickJS binary from bellard.org.

### Previous Versions (Incorrect)
```
quickjs-static-2024.01.13-r0.apk (Alpine Linux)
Version: 2024-01-13

quickjs-static-0.20250426-r0.apk (Alpine Linux)
Version: 2025-04-26
```

### Current Version (Correct - Official)
```
quickjs-linux-x86_64-2025-09-13.zip
Version: 2025-09-13
Source: bellard.org (official QuickJS releases)
```

## Why This Version?

According to yt-dlp's requirements:
- **Minimum required**: QuickJS `2023-12-9`
- **Strongly recommended**: QuickJS `2025-4-26` or later for **performance reasons**

The official `2025-09-13` release from bellard.org provides:
- ✅ **Official binary** from QuickJS creator (Fabrice Bellard)
- ✅ Exceeds minimum requirements
- ✅ Latest performance optimizations
- ✅ Direct from source (no third-party packaging)
- ✅ Best compatibility with yt-dlp

## Files Updated

All references to the old version were updated in:

1. `.github/workflows/build-quickjs.yml` - GitHub Action workflow
2. `scripts/download-quickjs.sh` - Linux/Mac download script
3. `scripts/download-quickjs.ps1` - Windows download script
4. `QUICKJS_SETUP.md` - Main setup documentation
5. `QUICKSTART.md` - Quick start guide
6. `DEPLOYMENT_CHECKLIST.md` - Deployment checklist
7. `IMPLEMENTATION_SUMMARY.md` - Implementation summary
8. `api/_bin/README.md` - Binary directory documentation

## Verification

To verify you have the correct version after downloading:

```bash
# Check file exists
ls -lh api/_bin/qjs

# Expected output:
# -rwxr-xr-x  1 user  group  ~5M  api/_bin/qjs

# The binary is from the official quickjs-linux-x86_64-2025-09-13 release
```

## Package Details

- **Source**: Official QuickJS releases (bellard.org)
- **Package**: `quickjs-linux-x86_64-2025-09-13.zip`
- **Version**: `2025-09-13`
- **Architecture**: `x86_64` (Linux)
- **Type**: Official binary release
- **Size**: ~1-2 MB (compressed), ~3-5 MB (extracted)
- **URL**: https://bellard.org/quickjs/binary_releases/quickjs-linux-x86_64-2025-09-13.zip

## Official Release Benefits

Using the official binary from bellard.org provides:
- Direct from QuickJS creator (Fabrice Bellard)
- No third-party packaging or modifications
- Latest optimizations and bug fixes
- Guaranteed compatibility with QuickJS ecosystem

## Next Steps

If you already downloaded the old version:
1. Delete the old binary: `rm api/_bin/qjs`
2. Run the updated download script or GitHub Action
3. Verify the new binary is in place
4. Commit and deploy

If you haven't downloaded yet:
- Just follow the updated instructions in `QUICKSTART.md`
- The scripts now use the correct version automatically

## References

- [Official QuickJS Binary Releases](https://bellard.org/quickjs/binary_releases/)
- [QuickJS Official Site](https://bellard.org/quickjs/)
- [yt-dlp QuickJS Requirements](https://github.com/yt-dlp/yt-dlp/discussions/14400)

---

**All documentation is now updated to use the official QuickJS binary (2025-09-13) from bellard.org.**
