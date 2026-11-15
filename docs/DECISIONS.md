# Decisions

Odluke donete uz specifikaciju (docs/SPEC.md).

- **Build:** GitHub Actions (Windows runner) pravi NSIS installer i portable `.exe`.
- **Distribucija i update:** GitHub Releases + Tauri updater (potpisan Tauri ključem). Repo je public.
- **Code signing:** v1 bez Windows sertifikata (SmartScreen upozorenje je očekivano).
- **Portable:** konfiguracije i podešavanja se čuvaju pored `.exe` fajla.
- **Jezik UI-a:** engleski i srpski (latinica), izbor u Settings.
- **AIO ventilatori:** podrazumevano povezani (isti smer), opcija za razdvajanje.
- **GPU:** vizuelizacija uključuje usisavanje odozdo i izbacivanje toplog vazduha.
- **Aura GC1/GC5/GC6/GC7:** specifikacije iz zvaničnih linkova koje dostavlja vlasnik projekta.
- **Testiranje:** UI se testira kao web build u headless browseru; Tauri build proverava vlasnik na Windowsu.
