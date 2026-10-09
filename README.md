# Njuškica — salon za šišanje i negu pasa, Čačak

Sajt salona sa online zakazivanjem termina i panelom za vlasnika.

## Kako se otvara

| Šta | Adresa |
| --- | --- |
| Sajt za klijente | `https://janamalisic.github.io/njuskica/` |
| Panel za vlasnika | `https://janamalisic.github.io/njuskica/admin.html` (traži PIN) |

Sajt se objavljuje preko GitHub Pages: **Settings → Pages → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**. Posle minut-dva sajt je na adresi iznad.

## Fajlovi

| Fajl | Šta je |
| --- | --- |
| `index.html` | sajt za klijente |
| `admin.html` | stranica za vlasnika (PIN, radno vreme, termini) |
| `style.css` | izgled oba fajla |
| `app.js` | zakazivanje, panel za vlasnika, čuvanje podataka |
| `pas-sedi.webp` / `.png` | pas koji sedi: početni ekran, izbor veličine |
| `pas-portret.webp` / `.png` | portret: SPA oblak |
| `pas-trci.webp` / `.png` | pas koji trči: kartica „Čačak", potvrda termina |
| `favicon.png`, `apple-touch-icon.png` | ikonica u tabu i na telefonu |

Sliku menjate tako što otpremite novu sa istim imenom (PNG sa providnom pozadinom), a WebP verziju napravite iz PNG-a (npr. na squoosh.app) i otpremite pod istim imenom sa `.webp`.

## Šta se menja u `index.html`

- **Logo:** sada je tekst „Njuškica". Potražite `class="logo"` i zamenite tekst sa `<img src="logo.png" alt="Njuškica">`.
- **Instagram i TikTok:** blok `SOCIAL` na vrhu `app.js`. Adresa se upiše na jednom mestu, a sajt je sam stavi u karticu „Čačak", meni i podnožje. TikTok nalog je trenutno pretpostavljen (isti kao Instagram); ako ga nema, ostavite prazno `""` i ikonica se sakriva.
- **Cene i trajanje:** blok `TREATMENTS` u skripti (cene u RSD za male, srednje i velike pse).
- **Podrazumevano radno vreme:** blok `DEFAULT_SETTINGS`.
- **Adresa i telefon:** potražite `TODO`.

## Panel za vlasnika

Otvara se na `admin.html` (link iznad). Na sajtu za klijente nema linka ka njemu. Stranica traži PIN; posle pet pogrešnih pokušaja čeka se minut. Tu se podešavaju radno vreme po danima, razmak između termina, koliko dana unapred se zakazuje, slobodni dani i pauze, i vide se zakazani termini.

PIN je za sada demo PIN i menja se u `app.js` (linija `const OWNER_PIN_HASH`). PIN se nigde ne čuva u kodu, samo njegov otisak (SHA-256).

Ograničenje: ovo je brava na vratima, ne sef. Pošto sajt nema server, neko ko zna da čita kod može da zaobiđe PIN u svom pregledaču, ali u demo režimu time vidi samo svoje lokalne podatke. Kad se doda baza (Supabase), prijava vlasnika mora da ide kroz bazu (Supabase Auth), i tada je zaštita prava.

Uz svaki termin u listi stoje „Kopiraj poruku" (gotova poruka potvrde za klijenta, lepi se u Viber, WhatsApp ili SMS) i „SMS" (otvara poruke na telefonu sa već upisanim tekstom i brojem). Tekst poruke je u `app.js`, funkcija `ownerMsg`; tu dodajte adresu salona kad je budete imali.

## Potvrda za klijenta

Posle zakazivanja klijent vidi potvrdu sa dugmadima „Dodaj u kalendar" i „Podeli potvrdu" (na telefonu otvara deljenje, na računaru snima tekstualni fajl). Potvrda ostaje sačuvana u pregledaču klijenta: na sajtu se pojavljuje kartica „Vaš termin" iznad radnog vremena i stavka „Moj termin" u meniju, sve dok termin ne prođe.

## Važno: gde se čuvaju termini

Na GitHub Pages sajt radi u **demo režimu**: termini i radno vreme se čuvaju samo u pregledaču u kom su uneti. Klijentov termin zato ne stiže do vlasnika.

Da bi termini stizali do vlasnika, sajtu treba baza podataka (na primer Supabase, besplatan plan). Skripta je pripremljena za to: sve čuvanje prolazi kroz jedan objekat `Store`, pa se baza dodaje bez menjanja izgleda.

Verzija na Claude-u (claude.ai artifact) već ima zajedničku bazu i tamo termini stižu u panel uživo.
