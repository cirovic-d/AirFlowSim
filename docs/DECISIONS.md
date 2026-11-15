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
- **Orijentacija crteža:** pogled kroz stakleni (levi) panel na ploču – zadnji deo (I/O, zadnji ventilator) levo, prednji panel desno.
- **GPU preseti:** Small 200 mm, Medium 270 mm, Large 330 mm; ručni unos 100–450 mm. Kompatibilnost se poredi samo sa zvaničnom maks. dužinom GPU-a; bez validne dužine prikazuje se "Unknown".
- **360 AIO:** dostupan samo gde proizvođač navodi 360 mm radijator (Antec C3 gore, GC5/GC6 napred). Radijator zauzima 3 mesta na toj poziciji; njegovi ventilatori se ne mogu ukloniti pojedinačno, ali im se menja smer (pojedinačno ili svi odjednom).
- **Tower:** jedan 120 mm ventilator, smer ka pozadini ili ka prednjem delu. **Wraith:** fiksan, duva ka staklu.
- **Pritisak:** broje se samo ventilatori kućišta i radijatora; CPU i GPU ventilatori ne ulaze u procenu.
- **Animacija protoka:** Canvas 2D preko SVG crteža (ne prima klikove). Grid 6 mm sa smerom vazduha se računa samo kad se konfiguracija promeni; čestice (do ~320) ga prate i crtaju se kao kratke linije koje blede (efekat dima). Boja prelazi iz intake u exhaust boju kako vazduh "stari". Čestice izlaze samo kroz exhaust ventilatore; vazduh pritisnut uz zid brzo izbledi (curenje kroz procepe). Bez intake ventilatora vazduh ulazi kroz poklopce slotova pozadi.
- **Animacija se pauzira** kad je prozor sakriven/minimizovan.
- **Brzina ventilatora:** jedan globalni klizač 20–100 %, utiče samo na brzinu čestica.
- **Antec C3 shroud:** nagnut (niži ka prednjem delu, ugao aproksimiran); iznad donjeg ventilatora je perforirani deo kroz koji vazduh prolazi (HDD kavez izvađen). Ostala kućišta: ravan shroud.
- **Čuvanje podataka:** jedan `data.json`. Instalirana verzija (pored exe-a postoji `uninstall.exe`) → `%APPDATA%\com.cirovic.airflowsim`; portable → folder `AirflowSimData` pored exe-a. Upis ide preko privremenog fajla da se ne pokvari pri padu.
- **Konfiguracija** čuva: kućište, ventilatore (mesto, smer, radijator), GPU, CPU hladnjak, brzinu ventilatora i boje protoka. JSON export ima zaglavlje `{"app": "PC Airflow Simulator", "format": 1}`; import proverava svako polje i odbacuje nepoznato.
- **Simulator ostaje učitan** kad se pređe na drugi ekran (stanje se ne gubi), a animacija se tada pauzira.
- **Uticaj komponenti na vazduh:** GPU ventilatori usisavaju vazduh odozdo (svaki iz svoje zone), vazduh prolazi kroz karticu i izlazi gore zagrejan. Tower/Wraith zagrevaju vazduh koji prođe kroz hladnjak. Vazduh koji ulazi kroz AIO radijator je već topliji. Boja čestice = toplota (plava hladno → narandžasta toplo).
