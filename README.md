# Asteroids Arcade (Static Web Project)

Ein kleines, direkt spielbares Asteroids-Arcade-Spiel im Retro-Look – komplett ohne Backend und ohne Build-Prozess.

## Features
- 2D-Canvas-Gameplay mit Trägheit und Bildschirm-Wrapping.
- Steuerung mit Pfeiltasten + Leertaste.
- Asteroiden in mehreren Größen (groß → mittel → klein).
- Kollisionen, Leben (3), Score-System und Wellen.
- Game-Over-Screen mit Neustart über `R`.
- Reines HTML/CSS/JavaScript (statische Dateien).

## Lokaler Start
Es gibt keinen Build-Step. Datei direkt im Browser öffnen oder einen simplen Static-Server nutzen.

### Variante 1 (direkt öffnen)
1. Repository klonen oder herunterladen.
2. `index.html` im Browser öffnen.

### Variante 2 (empfohlen: kleiner lokaler Static-Server)
Im Projektordner ausführen:

```bash
python3 -m http.server 8080
```

Dann im Browser öffnen:

```text
http://localhost:8080
```

## Deployment als statische GitHub-Vorschau (GitHub Pages)
1. Projekt nach GitHub pushen.
2. In GitHub: **Settings → Pages**.
3. Unter **Build and deployment** bei **Source**: `Deploy from a branch` wählen.
4. Branch auswählen (z. B. `main`) und Ordner `/ (root)` setzen.
5. Speichern – nach kurzer Zeit ist das Spiel über die angezeigte Pages-URL erreichbar.

## Steuerung
- **Pfeil links / rechts**: Schiff rotieren
- **Pfeil hoch**: Schub
- **Leertaste**: Schießen
- **Pause-Button** über dem Spielfeld: Spiel pausieren/fortsetzen
- **R** (bei Game Over): Spiel neu starten

## Projektstruktur
```text
.
├── index.html   # Seitenstruktur + Canvas-Einbindung
├── style.css    # Retro-Arcade-Styling
├── script.js    # Spiel-Logik (Loop, Input, Rendering, Kollisionen)
└── README.md    # Projektbeschreibung und Start/Hosting-Anleitung
```
