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
- **Wraith stock cooler:** vizuelno duva napred, ka staklenom bočnom panelu (ka posmatraču), vazduh se širi oko hladnjaka.
- **Profili kućišta:** `src/data/cases/*.json`, sa izvorima. `directionVerified: false` znači da je smer fabričkog ventilatora standardan (front intake / rear exhaust), ali nije eksplicitno naveden u izvoru.
- **Aura GC1:** koristi se obična verzija (ne ELITE).
- **Raspored na crtežu:** koje pozicije postoje i koliko ventilatora staje dolazi iz verifikovanih podataka proizvođača; tačni mm položaji na crtežu su aproksimirani iz dimenzija kućišta (`src/lib/layout.ts`).
- **Fabrički ventilatori** zauzimaju prva mesta na svojoj poziciji (napred odozgo nadole, gore od pozadi ka napred).
- **Interakcija:** klik na prazno mesto dodaje ventilator (napred/bočno/dole = intake, gore/pozadi = exhaust), klik na ventilator menja smer, × uklanja.
