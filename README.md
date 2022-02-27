# S10anzeigen

*S10anzeigen* ist eine Webanwendung, welche die von [S10auslesen](https://github.com/senneschall/S10auslesen) aufbereiteten, aktuellen Messwerte eines E3/DC S10 Hauskraftwerk grafisch animiert darstellt.

![Beispiel](/docs/S10anzeigen.jpg)

## Zielplattform

*S10anzeigen* wurde als reine Webanwendung entworfen und geschrieben mit HTML5, CSS3, JavaScript und SVG1.1, um eine möglichst große Anzahl an unterstützen Plattformen zu bedienen. Da nur ein Browser benötigt wird, um *S10anzeigen* auszuführen, werden alle Klassen von Geräten unterstützt, vom Computer über Mobiltelefone.

## Funktionsweise

*S10anzeigen* besteht aus einem HTML-Grundgerüst, welches zusammen mit dem CSS für eine korrekte Anordnung der Bilder zueinander sorgt. Die Bilder bestehen aus SVG-Dateien, auf deren Bestandteile mittels JavaScript zugegriffen werden kann. Mittels JavaScript werden zyklisch die aktuellen S10 Messdaten eingelesen, ausgewertet und die entsprechenden Animationen in den Bildern ausgelöst.

Als Quelle der S10 Messwerte nutzt *S10anzeigen* die von [S10auslesen](https://github.com/senneschall/S10auslesen) erstellte JSON-Datei als Datenquelle für die aktuellen Messwerte des S10 Hauskraftwerks. Da die Same-Origin-Policy der Browser nicht verletzt werden soll, ist die Idee, dass *S10anzeigen* sowie die Daten von [S10auslesen](https://github.com/senneschall/S10auslesen) über denselben Webserver ausgeliefert werden. Ein lokales Öffnen von *S10anzeigen* wird von den Browsern mit einer Fehlermeldung quittiert.

## Lizenz

![GPLv3](https://www.gnu.org/graphics/gplv3-88x31.png) Alle Bestandteile von *S10anzeigen*, welche Quellcode enthalten, werden unter der **GNU General Public License v3.0 or later** [GPL-3.0-or-later](LICENSE.md) lizensiert.
Das betrifft im Einzelnen: Alle Dateien mit den Endungen `html`, `css`, `js`, `json` und `svg` werden unter der GPLv3 lizensiert.

Alle Bilder mit der Endung `jpg` stehen unter der **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International** [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

Die Schriftarten mit der Endung `woff2` stehen unter der **SIL Open Font License** [OFL-1.1 Lizenz](https://github.com/FAlthausen/Vollkorn-Typeface/blob/master/OFL.txt), mehr dazu im Absatz **Abhängigkeiten**.

## Abhängigkeiten

Das Design von *S10anzeigen* ist so angelegt, dass die Schriftart [Vollkorn](https://github.com/FAlthausen/Vollkorn-Typeface) genutzt wird. Da Vollkorn ebenso wie *S10anzeigen* unter einer freien Lizenz steht, können und werden die benötigten Dateien der Schriftart gemeinsam mit *S10anzeigen* ausgeliefert. Es müssen damit keine externen Abhängigkeiten aufgelöst werden.

Mehr zu Vollkorn kann man auf ihrer [Webseite](http://vollkorn-typeface.com/) erfahren.

## Einrichten

Um fehlerfrei zu funktionieren, muss *S10anzeigen* in der vorgegebenen Ordnerstruktur auf den Webserver gelegt werden. Die `.html`, `.css` und `.js` liegen im Wurzelverzeichnis, darüber hinaus werden die Unterverzeichnisse `img`, `lang` und `svg` samit Inhalt benötigt.
Das Unterverzeichnis `json` ist das Verzeichnis, in dem die von [S10auslesen](https://github.com/senneschall/S10auslesen) erzeugte JSON-Datei regelmäßig abgelegt wird.

### Webserver

Als Webserver eignen sich alle erhältlichen Webserver ohne Einschränkung.

### Optionen

| Adresszeilenoption | Typ | Beschreibung |
| ---- | ---- | ---- |
| long | float | Längengrad des Standorts der PV-Anlage als Dezimalzahl mit . als Dezimaltrennzeichen (default: Mittelpunkt EU) |
| lat | float | Breitengrad des Standorts der PV-Anlage als Dezimalzahl mit . als Dezimaltrennzeichen (default: Mittelpunkt EU) |
| d | int | Aktualisierungsrate in Sekunden (default: 2) |
| P | int | Peak-Leistung der PV-Anlage in Watt (default: 10000) |
| psmax | int | typische Maximalleistung bei Sonnenhöchststand zur Sommersonnenwende in Watt (default: 8000) |
| psmin | int | typische Maximalleistung bei Sonnenhöchststand zur Wintersonnenwende in Watt (default: 6000) |
| s | any | Slow-Modus für langsame Anzeigegeräte: vereinfacht die Animationen |
| n | any | unterdrückt sämtliche Animationen, es werden nur noch die Werte aktualisiert |

Die Optionen werden dabei, wie bei Webseiten üblich, über die URL eingegeben, z.&nbsp;B. so:
> http://<server.ip>/index.html?d=1&long=9.902&lat=49.843&P=15000&psmax=12000&psmin=9000

*S10anzeigen* soll sich jede Sekunde aktualisieren, die PV-Anlage befindet sich an den Koordinaten 49.843°N 9.902°O, hat eine Peakleistung von 15kW und hat als typische Höchstleistung im Sommer 12kW und im Winter 9kW.

Die typischen Maximalleistungen werden von *S10anzeigen* nur für eine grobe Näherung genutzt, um das PV-Symbol entsprechend teil- oder vollständig bewölkt darzustellen.

### Konfigurieren

Anstatt die Optionen jedes Mal per URL zu übermitteln ist es auch möglich, die Standardeinstellungen in der `func.js` für den eigenen Bedarf anzupassen. Die Einstellungen sind dabei in den Konstanten am Anfang der Datei unmittelbar nach dem Init zu finden und entsprechend kommentiert.

### Minify

Wenn *S10anzeigen* direkt vom Repository heruntergeladen wird und für den Einsatz außerhalb des lokalen Netzwerkes verwendet wird, empfiehlt es sich noch die JavaScript-Datei zu minimieren, um Bandbreite zu sparen. Eine Minimierung von `func.js` bietet das Potenzial, die Dateigröße etwas mehr als zu halbieren. Eine Möglichkeit der online-Minimierung bietet dafür [jscompress.com](https://jscompress.com/).

