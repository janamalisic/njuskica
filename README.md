# Njuškica — salon za šišanje i negu pasa, Čačak

Sajt salona sa online zakazivanjem termina i panelom za vlasnika.

## Kako se otvara

| Šta | Adresa |
| --- | --- |
| Sajt za klijente | `https://janamalisic.github.io/njuskica/` |
| Panel za vlasnika | `https://janamalisic.github.io/njuskica/#admin` |

Sajt se objavljuje preko GitHub Pages: **Settings → Pages → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**. Posle minut-dva sajt je na adresi iznad.

## Fajlovi

| Fajl | Šta je |
| --- | --- |
| `index.html` | ceo sajt: izgled, zakazivanje, panel za vlasnika |
| `pas-sedi.png` | pas koji sedi: početni ekran, izbor veličine |
| `pas-portret.png` | portret: slike u naslovu, SPA oblak, pas koji viri sa ivice |
| `pas-trci.png` | pas koji trči: kartica „Čačak", potvrda termina |

Sliku menjate tako što otpremite novu sa istim imenom (PNG sa providnom pozadinom).

## Šta se menja u `index.html`

- **Logo:** potražite `LOGO` i zamenite ga sa `<img src="logo.png" alt="Njuškica">`.
- **Cene i trajanje:** blok `TREATMENTS` u skripti (cene u RSD za male, srednje i velike pse).
- **Podrazumevano radno vreme:** blok `DEFAULT_SETTINGS`.
- **Adresa i telefon:** potražite `TODO`.

## Važno: gde se čuvaju termini

Na GitHub Pages sajt radi u **demo režimu**: termini i radno vreme se čuvaju samo u pregledaču u kom su uneti. Klijentov termin zato ne stiže do vlasnika.

Da bi termini stizali do vlasnika, sajtu treba baza podataka (na primer Supabase, besplatan plan). Skripta je pripremljena za to: sve čuvanje prolazi kroz jedan objekat `Store`, pa se baza dodaje bez menjanja izgleda.

Verzija na Claude-u (claude.ai artifact) već ima zajedničku bazu i tamo termini stižu u panel uživo.
