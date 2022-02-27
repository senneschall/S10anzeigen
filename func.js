/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * S10anzeigen animates the reading of a E3/DC S10 in a graphical way      *
 * Copyright (C) 2018-2022 - senneschall <senneschall@web.de>              *
 * This file is part of S10anzeigen.                                       *
 *                                                                         *
 * S10anzeigen is free software: you can redistribute it and/or modify     *
 * it under the terms of the GNU General Public License as published by    *
 * the Free Software Foundation, either version 3 of the License, or       *
 * (at your option) any later version.                                     *
 *                                                                         *
 * S10anzeigen is distributed in the hope that it will be useful,          *
 * but WITHOUT ANY WARRANTY; without even the implied warranty of          *
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the           *
 * GNU General Public License for more details.                            *
 *                                                                         *
 * You should have received a copy of the GNU General Public License       *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.  *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
/* *** init *** */
let params = new URLSearchParams(document.location.search.substring(1)); // get all parameters
let d = params.get("d"); // duration length in second
let P = params.get("P"); // PV peak power
let psmax = params.get("psmax"); // average PV peak power mid summer
let psmin = params.get("psmin"); // average PV peak power mid winter
let lon = Number.parseInt(params.get("long"));
let lat = Number.parseInt(params.get("lat"));
/* *** user settings for pv location *** */
const pvLONGITUDE = (lon !== null) && (!Number.isNaN(lon)) ? lon : +9.902; /* TODO: put the longitude of you pv here */
const pvLATITUDE = (lat !== null) && (!Number.isNaN(lat)) ? lat : +49.843; /* TODO: put the latiitude of you pv here */
/* *** essential settings *** */
const JURL = "json/s10daten.json"; // where to get the current S10 data
const DUR = d === null ? 2000 : 1000 * (Number.isNaN(Number.parseInt(d)) ? 2 : Math.max(1, Number.parseInt(d))); // length of animations in milliseconds
const SLOW = params.get("s") !== null; // Slow mode enabled with reduced animations
const NOAN = params.get("n") !== null; // disable all animations
const DURSUN = SLOW ? 300000 : 60000; // length of interval between re-calculation if sun has set in milliseconds
const ANIM = 10; // animation steps for approximations
const PMAX = P === null ? 10000 : (Number.isNaN(Number.parseInt(P)) ? 10000 : Math.max(1, Number.parseInt(P))); // the PV peak power
const PSUMMAX = psmax === null ? 0.8 * PMAX : (Number.isNaN(Number.parseInt(psmax)) ? 0.8 * PMAX : Math.max(1, Number.parseInt(psmax))); // maximum expected PV power on noon on begin of northern hemisphere summer
const PSUMMIN = psmin === null ? 0.6 * PMAX : (Number.isNaN(Number.parseInt(psmin)) ? 0.6 * PMAX : Math.max(1, Number.parseInt(psmin))); // maximum expected PV power on noon on begin of northern hemisphere winter
/* *** threshold values *** */
const SUNPART = 2; // show cloud in front of sun if power generation is lower than 1/this
const CLOUDY = 10; // show only cloud if power generation is lower than 1/this
const LOPSIDE = 0.075; // indicate partly showed if one line differes from the other by a factor of 4+this
const GRID = 20; // animate if grid power (in or out) is greater than this
const BATIN = 20; // animate if charging power is greater than this
const BATOUT = 10; // animate if discharge power is greater than this
const HOMDIR = 20; // animate if direct power use is greather than thi
const HOMIN = 0; // animate if home power consumption is greather than this
const PV = 20; // animate if PV power generation is greather than this
const SCALE = 5; // maximum scale of power spark
/* *** constants *** */
const EDAY = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335]; // elapsed days of the year for each month in a leap year
const DSPL = "display";
const NONE = "none";
const FILL = "fill";
const TEXT = "txt";
/* *** localisation containing every string that is shown on the site *** */
var L10N;
/* *** cache *** */
var cSOC = -1; // battery state of charge
var cANIM = Promise.resolve(); // status of all animations
var cEMS = 0; // status S10 smart functions
var cUPS = 0; // status S10 uninterruptible power supply
var cAUT = -1; // autarky
var cOWN = -1; // direct consumption
var cISLE = false; // works in island mode with no power grid connected and all the hous energy coming from the battery
var cNIGHT = false; // false: day time and PV is working; true: night time and PV shut down
var cSUN = true; // sun is shown
var cCLOUD = false; // cloud is shown instead of sun
var cMOON = false; // moon is shown instead of sun
var cSHADOW = false; // tree is shown before the sun
var cEXTSRC = false; // external source available
var cWBOX = 0; // wallbox available
var cPMAX = 0.7 * PMAX; // the maximum power the PV can provide right now
var cPGRID = 0; // power delivered to grid
var cBGIMG = 0; // background image: 0 = none; 1 = sun; 2 = battery; 3 = grid
var cHOMEWINDOW = 0; // home icon window is illuminated
var cDATEDAY = 0; // day of the month for sunrise calculation
var cSUNRISETIME = 0; // time of sunrise
var cSUNSETTIME = 0; // time of sunset

/* *** start trigger event *** */
window.onload = Go;

/**
 * Starts the initialization of the program;
 * l10n is set according to the language settings of the browser;
 */
async function Go() {
    try {
        let i18n = (navigator.language.length > 2 ? navigator.language.slice(0,2) : navigator.language) === "de" ? "de" : "de"; // stub variable; extend once more translations are available
        let lang = fetch("lang/" + i18n + ".json")
            .then(response => {
                if (response.ok) { return response.json(); }
                else { return Promise.reject({status: response.status, statusText: response.statusText}); }
            })
            .then(json => { L10N = json; Translate(); })
            .catch(e => { window.alert("Fehler beim Laden der Lokalisierung"); throw e; });
        SetTimeDependends();
        await lang;
        Refresh();
    } catch (e) { setTimeout(Go, 5 * DUR); }
}

/**
 * translates the static svg texts;
 */
function Translate() {
    document.title = L10N.title;
    document.getElementById("sown").contentDocument.getElementById("ownq").innerHTML = L10N.ownq;
    document.getElementById("sems").contentDocument.getElementById("lock").innerHTML = L10N.lock;
    document.getElementById("saut").contentDocument.getElementById("auty").innerHTML = L10N.auty;
    document.getElementById("said").contentDocument.getElementById("epwr").innerHTML = L10N.epwr;
}

/**
 * formats the output string for better readability, i.e. makes 12,3kW out of 12300;
 * @param {number} p Power in Watt;
 * @returns a string where Watt is replaced with kW if it's more than 10kW;
 */
function ShowP(p) {
    if (Math.abs(p) > 10000) return (p / 1000).toFixed(1) + L10N.kW; // show above 10kW as '10,0 kW' and not '10000 Watt'
    if (Math.abs(p) >= 0) return p + L10N.W;
    return "";
}

/**
 * determines if the sun is above or below the horizon and approximates the current pv peak power;
 * cSUNRISE sunrise time, not updated until the next day;
 * cSUNSET sunset time, not updated until the next day;
 * cNIGHT true: sun below horizon, no pv power to be expected; false: sun above horizon, pv power to be expected;
 * cPmax approximation of pv peak power under full sunlight, not updated until DURSUN seconds has passed;
 */
function SetTimeDependends(){
    const date = new Date();
    const year = date.getUTCFullYear(); // 20xx
    const month = date.getUTCMonth(); // 0..11
    const day = date.getUTCDate(); // 1..31
    const doy = EDAY[month] + day - (((year & 3) && (month > 1)) ? 1 : 0); // day of the year with leap-year correction
    if (day !== cDATEDAY) { // expensive sunset calculation (> 15 calls to Math.sin()) needs only to be calculated once per day
        cDATEDAY = day;
        /* *** sunset/sunrise *** */
        const hour = date.getUTCHours();
        const minute = date.getUTCMinutes();
        const second = date.getUTCSeconds();
        const jde = (Date.UTC(year, month, day, hour, minute, second) / 86400000) - 10957.5; // time (Julian Days elapsed) since J2000.0 in days
        const omega = 2.1429 - 0.0010394594 * jde; // temp angle
        const mLong = 4.8950630 + 0.017202791698 * jde; // geometrical mean longitude of the sun in rad
        const mAnom = 6.2400600 + 0.0172019699 * jde; // geometrical mean anomaly of the sun in rad
        const eLong = mLong + 0.03341607 * Math.sin(mAnom) + 0.00034894 * Math.sin(2 * mAnom) - 0.0001134 - 0.0000203 * Math.sin(omega); // ecliptic longitude of the sun in rad
        const eObl = 0.4090928 - 6.2140e-9 * jde + 0.0000396 * Math.cos(omega); // obliquity of the ecliptic in rad
        const decl = Math.asin(Math.sin(eObl) * Math.sin(eLong)); // sun declination in rad
        const difft = 12 * Math.acos((Math.sin(-0.0145) - Math.sin(pvLATITUDE * Math.PI / 180) * Math.sin(decl)) / (Math.cos(pvLATITUDE * Math.PI / 180) * Math.cos(decl))) / Math.PI; // hour angle converted to hours
        const eqot = -0.171 * Math.sin(0.0337 * doy + 0.465) - 0.1299 * Math.sin(0.01787 * doy - 0.168); // equation of time -> difference between apparent und mean solar time in hours
        const noon = Date.UTC(year, month, day, 12 - (date.getTimezoneOffset() / 60), 0, 0); // noon in mean solar time in ms
        /* *** time of sunrise and sunset to be cached *** */
        cSUNRISETIME = noon + (-difft - eqot - (pvLONGITUDE / 15) + (date.getTimezoneOffset() / 60)) * 3600000; // in ms
        cSUNSETTIME = noon + (difft - eqot - (pvLONGITUDE / 15) + (date.getTimezoneOffset() / 60)) * 3600000; // in ms
    }
    const tnow = date.getTime(); // time now
    cNIGHT = (tnow < cSUNRISETIME || tnow > cSUNSETTIME) && (cPGRID < PV); // pv delivers some more power right after the sunset due to indirect lighting, so only swith to night mode if the actual pv power nears zero
    /* !!the following approximation is derived with the northern heimsphere in mind; for the southern hemisphere pSUMmax and pSUMmin are to be thought in reverse!! */
    // maximum power the pv can deliver at peak sun: linear approximation from the date of lowest power (northern hemisphere ~21.December) to highest power (21.June)
    const dsm = (doy + 10) % 365; // day since min: day of year beginning from minimum sun heigth (~21.12. previous year, i.e. additional 10 days from last year)
    const ml = (dsm > 182 ? -1 : 1) * (PSUMMAX - PSUMMIN) / 182.5; // gradient of line
    const tl = PSUMMAX - 182.5 * ml ; // intecept of line
    const maxp = ml * dsm + tl; // maximum power at peak sun: linear approach y=m*x+t
    const tnoon = (cSUNRISETIME + cSUNSETTIME) / 2; // approximation sun peak
    // maximum power the pv can deliver at arbitrary time during day: quadratic approximation from P=0 at time of sunrise and sunset to Pmax at half-time in between
    const a = maxp / (tnoon * tnoon - tnoon * cSUNRISETIME - tnoon * cSUNSETTIME + cSUNRISETIME * cSUNSETTIME);
    const b = -a * (cSUNRISETIME + cSUNSETTIME);
    const c = a * cSUNRISETIME * cSUNSETTIME;
    cPMAX = a * tnow * tnow + b * tnow + c; // quadratic approximation y=a*x²+b*x+c should expose low calculation cost
    // recalculate every once is a while should be sufficient and in line with inaccuracy of approximation
    setTimeout(SetTimeDependends, DURSUN);
}

/**
 * reads the current values of the json, updates the numbers and starts the animations accordingly;
 * restarts every DUR seconds
 */
async function Refresh() {
    let news = fetch(JURL, {cache: "no-store"})
        .then(data => data.json())
        .catch(() => Promise.resolve());
    await Promise.all([cANIM, news]);
    setTimeout(Refresh, DUR);
    news.then(x => {
        if (x !== undefined && x !== null) {
            const ext = x.Pext > 0 ? 0 : -x.Pext;
            const pwbx = x.Pwbx > 0 ? x.Pwbx : 0;
            const box = x.Wb1 | x.Wb2 | x.Wb3 | x.Wb4 | x.Wb5 | x.Wb6 | x.Wb7 | x.Wb8;
            cPGRID = x.Pnetz > 0 ? 0 : -x.Pnetz;
            const nzbez = x.Pnetz > 0 ? x.Pnetz : 0;
            const btein = x.Pbat > 0 ? x.Pbat : 0;
            const btbez = x.Pbat > 0 ? 0 : -x.Pbat;
            const dirverbr = x.Ppv + ext - cPGRID - btein - pwbx;
            if (x.SOC !== cSOC) { cSOC = x.SOC; PartAnimBat(cSOC); }
            AnimRatio(x.autark, x.eigen);
            if (!NOAN) AnimBground(dirverbr, nzbez, btbez);
            cANIM = Promise.all([
                AnimStatus(x.EMS, x.NOT),
                AnimPext(ext),
                AnimWbox(pwbx, box),
                AnimSun(x.Ppv, x.Pdc1, x.Pdc2),
                AnimArrow(cNIGHT ? 0 : cPGRID, "pv2nz", GRID, "#fd5", L10N.grin, 2),
                AnimGrid(x.Pnetz, x.Ppv),
                AnimArrow(btein, "pv2bt", BATIN, "#18f", L10N.btin, 1),
                AnimArrow(dirverbr, "pv2hs", HOMDIR, "#1a2", L10N.dir, 3),
                AnimArrow(nzbez, "nz2hs", GRID, "#777", L10N.grout, 1),
                AnimBat(x.Pbat),
                AnimArrow(btbez, "bt2hs", BATOUT, "#18f", L10N.btout, 2),
                AnimHome(x.Phaus)
            ]).catch(() => Promise.resolve());
        }
    }).catch(() => cANIM = Promise.resolve());
}

/**
 * manipulation of the background image;
 * @param {number} dirverbr power from the pv directly consumed (expected dirverbr > 0);
 * @param {number} nzbez power from the power grid (expected nzbez > 0);
 * @param {number} btbez power from the battery (expected btbez > 0);
 */
function AnimBground(dirverbr, nzbez, btbez) {
    let old = cBGIMG === 1 ? "bs" : cBGIMG === 2 ? "bb" : cBGIMG === 3 ? "bg" : "";
    let img = "";
    let nimg = 0; // which image to display
    if (nzbez >= dirverbr && nzbez >= btbez) { img = "bg"; nimg = 3; }
    if (btbez >= dirverbr && btbez >= nzbez) { img = "bb"; nimg = 2; }
    if (dirverbr >= nzbez && dirverbr >= btbez) { img = "bs"; nimg = 1; }
    if (nimg !== cBGIMG) {
        if (old !== "") document.body.classList.toggle(old);
        if (img !== "") document.body.classList.toggle(img);
        cBGIMG = nimg;
    }
}

/**
 * manipulation of the battey icon;
 * @param {number} soc state of charge of the battery (expected 0 .. 100);
 */
function PartAnimBat(soc) {
    let svg = document.getElementById("btsvg").contentDocument;
    svg.getElementById("soc").setAttribute(FILL, "hsl(" + soc*1.2 + ",80%,60%)");
    svg.getElementById("remain").setAttribute("height", 100 - soc);
    svg.getElementById(TEXT).innerHTML = L10N.soc + soc + "%";
}

/**
 * manipulation of ratio icons: autarky and self consumption;
 * @param {number} aut autarky (expected 0 .. 100);
 * @param {number} own self consumption (expected 0 .. 100);
 */
function AnimRatio(aut, own) {
    if (aut !== cAUT) {
        cAUT = aut;
        let saut = document.getElementById("saut").contentDocument;
        saut.getElementById(TEXT).innerHTML = aut + "%";
        saut.getElementById(TEXT).setAttribute(FILL, "hsl(" + aut*1.2 + ",80%,60%)");
    }
    if (own !== cOWN) {
        cOWN = own;
        let sown = document.getElementById("sown").contentDocument;
        sown.getElementById(TEXT).innerHTML = own + "%";
        sown.getElementById(TEXT).setAttribute(FILL, "hsl(" + own*1.2 + ",80%,60%)");
    }
}

/**
 * manipulation of status showing icon;
 * @param {number} ems EMS bitfield:
 * @param {number} aid uninterruptable power supply bitfield;
 * @returns Promise of animation;
 */
async function AnimStatus(ems, aid) { // status
    if ((ems === cEMS) && (aid === cUPS) && !(ems & 16)) return; // ems==16 triggers animation, therefore don't abort prematurely even if values didn't change

    if (cISLE && (aid !== 1)){ // switch off island operation
        document.getElementById("prev").innerHTML = "";
        let snz = document.getElementById("nzsvg").contentDocument;
        snz.getElementById("grid").setAttribute(DSPL, DSPL);
        snz.getElementById("island").setAttribute(DSPL, NONE);
        cISLE = false;
    }
    if (aid !== cUPS){ // NOT changes are rare so skip this sections skips most of the time to reduce calculation cost
        cUPS = aid;
        let said = document.getElementById("said").contentDocument;
        switch(aid) {
        case 1:
            said.getElementById(TEXT).innerHTML = L10N.on;
            said.getElementById("bolt").setAttribute(FILL, "#cc3");
            document.getElementById("prev").innerHTML = L10N.isle;
            if (!cISLE){
                let snz = document.getElementById("nzsvg").contentDocument;
                snz.getElementById("grid").setAttribute(DSPL, NONE);
                snz.getElementById("island").setAttribute(DSPL, DSPL);
                cISLE = true;
            }
            break;
        case 2:
            said.getElementById(TEXT).innerHTML = L10N.avail;
            said.getElementById("bolt").setAttribute(FILL, "#4c0");
            break;
        case 3:
            said.getElementById(TEXT).innerHTML = L10N.miss;
            said.getElementById("bolt").setAttribute(FILL, "#999");
            break;
        case 4:
            said.getElementById(TEXT).innerHTML = L10N.manoff;
            said.getElementById("bolt").setAttribute(FILL, "#e22");
            break;
        }
    }
    if (ems !== cEMS){ // EMS changes are rare so skip this sections skips most of the time to reduce calculation cost
        cEMS = ems;
        let sems = document.getElementById("sems").contentDocument;
        let txt = L10N.no;
        let tbatt = false;
        let tclock = false;
        let tweath = false;
        if (ems & 1){
            txt = L10N.charge;
        }
        if (ems & 2){
            txt = L10N.dischrg;
        }
        if (ems & 4){ // since ems==4 is the normal case all the default values are already set
        }
        if (ems & 8){ // charging disabled because of weather forecast
            txt = L10N.charge;
            tbatt = true;
            tweath = true;
        }
        if (ems & 16){ // feed-in limit reached (70% in Germany)
            txt = L10N.feedin;
        }
        if (ems & 32){ // charging disabled because manually selected time lock in the S10 portal
            txt = L10N.charge;
            tbatt = true;
            tclock = true;
        }
        if (ems & 64){ // discharging disabled because manually selected time lock in the S10 portal
            txt = L10N.dischrg;
            tbatt = true;
            tclock = true;
        }

        if (tbatt) sems.getElementById("batt").setAttribute("transform", "translate(-18 0)");
        else sems.getElementById("batt").setAttribute("transform", "");

        if (tclock) sems.getElementById("clock").setAttribute(DSPL, DSPL);
        else sems.getElementById("clock").setAttribute(DSPL, NONE);

        if (tweath) sems.getElementById("weathr").setAttribute(DSPL, DSPL);
        else sems.getElementById("weathr").setAttribute(DSPL, NONE);

        sems.getElementById(TEXT).innerHTML = txt;
    }
    if (ems & 16){ // let grid play blinking animation when overload is detected
        if (NOAN) return Promise.resolve();
        let snz = document.getElementById("nzsvg").contentDocument;
        return snz.getElementById("grid").animate([{opacity:1}, {opacity:0.3}, {opacity:1}, {opacity:0.3}, {opacity:1}], {duration: DUR}).finished;
    }
}

/**
 * maniupulation of battery icon;
 * @param {number} p state of charge of the battery (expected 0 .. 100);
 * @returns Promise of animation;
 */
async function AnimBat(p) { // animation battery
    if ((NOAN) || (cSOC < 0)) return Promise.resolve();
    let svg = document.getElementById("btsvg").contentDocument;
    const sc = SLOW ? 1 : 0.5 + SCALE * Math.min(p, PMAX) / PMAX; // the drop will be scaled to this
    const scal = SLOW ? "" : "translate(125px,74px) scale(" + sc + "," + sc + ") translate(-125px,-74px)";
    if (p > BATIN) return svg.getElementById("wdrop").animate([{transform: scal, fill: "#18f"},
        {transform: "translateY(" + (100 - cSOC) + "px) " + scal, fill: "#18f"},
        {transform: "translateY(" + Math.min(110 - cSOC, 107) + "px) " + scal, fill: "hsl(" + cSOC*1.2 + ",80%,60%)"}], {duration: DUR}).finished;
    if (p < -BATOUT) return svg.getElementById("wout").animate([{}, {transform: "translateY(-" + (8 + cSOC) + "px)"}], {duration: DUR}).finished;
}

/**
 * manipulation of pv cell, i.e. sun icon;
 * @param {number} p total power from pv (expected p > 0);
 * @param {number} p1 power from string 1 (expected p1 > 0);
 * @param {number} p2 power from string 2 (expected p2 > 0);
 * @returns Promise of animation;
 */
async function AnimSun(p, p1, p2) {
    const leist = p > PV ? p : 0;
    let svg = document.getElementById("pvsvg").contentDocument;
    if (cNIGHT) {
        if (!cMOON) { svg.getElementById("moon").setAttribute(DSPL, DSPL); cMOON = true; }
        if (cSUN) { svg.getElementById("sun").setAttribute(DSPL, NONE); cSUN = false; }
        if (cCLOUD) { svg.getElementById("cloud").setAttribute(DSPL, NONE); cCLOUD = false; }
        svg.getElementById(TEXT).innerHTML = "";
        return;
    }
    if (cMOON) { svg.getElementById("moon").setAttribute(DSPL, NONE); cMOON = false; }
    svg.getElementById(TEXT).innerHTML = L10N.pvsys + ShowP(leist);
    if (leist < cPMAX / SUNPART) {
        if (!cCLOUD) { svg.getElementById("cloud").setAttribute(DSPL, DSPL); cCLOUD = true; }
    } else {
        if (cCLOUD) { svg.getElementById("cloud").setAttribute(DSPL, NONE); cCLOUD = false; }
    }
    if (leist < cPMAX / CLOUDY) {
        if (cSUN) { svg.getElementById("sun").setAttribute(DSPL, NONE); cSUN = false; }
        return;
    }
    if (!cSUN) { svg.getElementById("sun").setAttribute(DSPL, DSPL); cSUN = true; }
    if (Math.abs((p1 - p2) / (p1 + p2)) > LOPSIDE) { // leist > cPmax/tCLOUDY is ensured, so no min power check needed and we can move straigt to asymmetric power detection
        if (!cSHADOW) { svg.getElementById("tree").setAttribute(DSPL, DSPL); cSHADOW = true; }
    } else {
        if (cSHADOW) { svg.getElementById("tree").setAttribute(DSPL, NONE); cSHADOW = false; }
    }
    if (SLOW || NOAN) {
        return Promise.resolve();
    } else {
        const tfr = " translate(-125px,-125px)";
        const tto = "translate(125px,125px) ";
        return svg.getElementById("beams").animate([
            {transform: tto + "scale(1,1)" + tfr, fill: "#ec4"},
            {transform: tto + "rotate(1deg) scale(1.02)" + tfr, fill: "#fd6"},
            {transform: tto + "scale(1,1)" + tfr, fill: "#ec4"},
            {transform: tto + "rotate(-1deg) scale(1.02)" + tfr, fill: "#fd6"},
            {transform: tto + "scale(1,1)" + tfr, fill: "#ec4"}
        ], {duration: DUR}).finished;
    }
}

/**
 * manipulation of house grid icon;
 * @param {number} p home power consumption (expected p > 0);
 * @returns Promise of animation;
 */
async function AnimHome(p) { // home power consumption
    const leist = p > HOMIN ? p : 0;
    let svg = document.getElementById("hssvg").contentDocument;
    svg.getElementById(TEXT).innerHTML = L10N.consum + ShowP(leist);
    if (leist === 0) {
        svg.getElementById("window").setAttribute(FILL, NONE);
        svg.getElementById("winout").setAttribute(DSPL, NONE);
        cHOMEWINDOW = 0;
        return Promise.resolve();
    } else if (cHOMEWINDOW === 0) {
        svg.getElementById("window").setAttribute(FILL, "#fd6");
        svg.getElementById("winout").setAttribute(DSPL, DSPL);
        cHOMEWINDOW = 1;
    }
    if (SLOW || NOAN) {
        return Promise.resolve();
    } else {
        return Promise.all([
            svg.getElementById("smk1").animate([{}, {transform: "translate(-4px,-25px)", opacity: "0"}], {duration: DUR}).finished,
            svg.getElementById("smk2").animate([{}, {transform: "translate(-8px,-21px)", opacity: "0"}], {duration: DUR}).finished,
            svg.getElementById("smk3").animate([{}, {transform: "translate(5px,-30px)", opacity: "0"}], {duration: DUR}).finished,
            svg.getElementById("smk4").animate([{}, {transform: "translate(1px,-46px)", opacity: "0"}], {duration: DUR}).finished,
            svg.getElementById("smk5").animate([{}, {transform: "translate(-9px,-52px)", opacity: "0"}], {duration: DUR}).finished,
            svg.getElementById("smk6").animate([{}, {transform: "translate(7px,-53px)", opacity: "0"}], {duration: DUR}).finished
        ]);
    }
}

/**
 * manipulation of power grid icon;
 * @param {number} p power from or to the power grid;
 * @param {number} pv power from the pv (expected pv > 0);
 * @returns Promise of animation;
 */
async function AnimGrid(p, pv) { // grid power
    const leist = Math.abs(p);
    const bpv = pv > PV; // PV generates power
    let svg = document.getElementById("nzsvg").contentDocument;
    svg.getElementById(TEXT).innerHTML = leist > GRID && (bpv || p > 0) ? L10N.grpwr + ShowP(leist) : ""; // only show text if there is power AND either there's PV generation of power is taken from the grid
    if (NOAN || (!bpv && p < 0)) return Promise.resolve(); // no animation if there's no PV but there's power fed into the grid, because that's just peaks from the battery or the house
    const sc = 0.5 + 0.5 * SCALE * Math.min(leist, PMAX) / PMAX; // scaling factor half of the sparks on the arrow because this spark here is then again rescaled to max 2.5 times the scale
    const scl0 = 2.5 * sc;
    const scl1 = 1.5 * sc;
    const scl2 = 0.75 * sc;
    const cto = "#777";
    const caw = "#fd5";
    return Promise.all([
        PartAnimGrid(p, svg, 1, 1, scl1, scl0, cto),
        PartAnimGrid(p, svg, 1, 2, scl2, scl1, cto),
        PartAnimGrid(p, svg, 2, 1, scl0, scl1, caw),
        PartAnimGrid(p, svg, 2, 2, scl1, scl2, caw)
    ]);
}

/**
 * part animation of power grid icon;
 * @param {number} p power from or to the power grid;
 * @param {string} svg innerHTML of svg to do animation upon;
 * @param {number} tw aniamtion on: (1) (right) power line towards pv; (2) (left) power line away from pv;
 * @param {number} nr animation on: (1) larger (left) half power line; (2) smaller (right) half power line;
 * @param {number} fr animation scale at begin;
 * @param {number} to animation scale at end;
 * @param {string} col color;
 * @returns Promise of animation;
 */
async function PartAnimGrid(p, svg, tw, nr, fr, to, col) { // grid animation :: p:power, svg:svg element, tw: 1->to 2->aw, nr: 1->1 2->2, fr: scale begin, to: scale end, col: color
    const ato = p > GRID ? DSPL : NONE;
    const aaw = p < -GRID ? DSPL : NONE;
    const id = "sp" + (tw === 1 ? "to" : "aw") + nr;
    svg.getElementById(id).setAttribute(DSPL, tw === 1 ? ato : aaw);
    svg.getElementById(id).setAttribute(FILL, col);
    const pid = "ln" + (tw === 1 ? "to" : "aw") + nr;
    let pth = svg.getElementById(pid);
    let len = pth.getTotalLength();
    let kfrm = [];
    const n = ANIM; // steps = animation keyframes - 1
    for (let i = 0; i <= n; i++) {
        let scl = i*(to - fr)/n + fr;
        const pt = pth.getPointAtLength((i*len)/n);
        kfrm[i] = SLOW ?
            {transform: "scale(" + scl + ") translate(" + pt.x/scl + "px," + pt.y/scl + "px)"} :
            {transform: "scale(" + scl + ") translate(" + pt.x/scl + "px," + pt.y/scl + "px) rotate(" + 360 * i / ANIM + "deg)"};
    }
    return svg.getElementById(id).animate(kfrm, {duration: DUR, easing: ( tw === 1 ? "ease-in" : "ease-out")}).finished.then(function(){ svg.getElementById(id).setAttribute(DSPL, NONE); }).catch(() => Promise.resolve());
}

/**
 * manipulation of external power source icon;
 * @param {number} p external power source (expected p >= 0);
 * @returns Promise of animation;
 */
async function AnimPext(p) { // external power source
    let svg = document.getElementById("sext").contentDocument;
    if (p > 0) {
        svg.getElementById(TEXT).innerHTML = p > 0 ? ShowP(p) : "";
        if (!cEXTSRC) {
            svg.getElementById("icon").setAttribute(DSPL, DSPL);
            svg.getElementById("exty").setAttribute(DSPL, DSPL);
            svg.getElementById(TEXT).setAttribute(DSPL, DSPL);
            cEXTSRC = true;
        }
    } else {
        if (cEXTSRC) {
            svg.getElementById("icon").setAttribute(DSPL, NONE);
            svg.getElementById("exty").setAttribute(DSPL, NONE);
            svg.getElementById(TEXT).setAttribute(DSPL, NONE);
            cEXTSRC = false;
        }
    }
    return Promise.resolve();
}

/**
 * manipulattion of wallbox icon;
 * @param {number} Pwbx power to wallbox (expected Pwbx > 0);
 * @param {number} Swbx wallbox status bitfield;
 * @returns
 */
async function AnimWbox(Pwbx, Swbx) { // wallbox
    let svg = document.getElementById("swbx").contentDocument;
    if (Pwbx > 0) svg.getElementById(TEXT).innerHTML = Pwbx > 0 ? ShowP(Pwbx) : "";
    if (Swbx !== cWBOX){ // Wallbox changes are rare so skip this sections skips most of the time to reduce calculation cost
        cWBOX = Swbx;
        if (cWBOX & 1) {
            svg.getElementById("box").setAttribute(DSPL, DSPL);
            svg.getElementById("wbxy").setAttribute(DSPL, DSPL);
        } else {
            svg.getElementById("box").setAttribute(DSPL, NONE);
            svg.getElementById("boxplug").setAttribute(DSPL, NONE);
            svg.getElementById("car").setAttribute(DSPL, NONE);
            svg.getElementById("carplug").setAttribute(DSPL, NONE);
            svg.getElementById("wbxy").setAttribute(DSPL, NONE);
            svg.getElementById(TEXT).setAttribute(DSPL, NONE);
            return Promise.resolve(); // if no wallbox is there no further icon states should be shown
        }
        if ((cWBOX & 4) || (cWBOX & 8)) {
            svg.getElementById("car").setAttribute(DSPL, DSPL);
            svg.getElementById("carplug").setAttribute(DSPL, DSPL);
            svg.getElementById("boxplug").setAttribute(DSPL, NONE);
            svg.getElementById(TEXT).setAttribute(DSPL, DSPL);
        } else {
            svg.getElementById("car").setAttribute(DSPL, NONE);
            svg.getElementById("carplug").setAttribute(DSPL, NONE);
            svg.getElementById("boxplug").setAttribute(DSPL, DSPL);
            svg.getElementById(TEXT).setAttribute(DSPL, NONE);
        }
        const clr = cWBOX & 4 ? "#4c0" : "#ee4"; // pure PV mode -> green; mixed mode -> yellow
        svg.getElementById("innentrapez").setAttribute(FILL, cWBOX & 8 ? clr : "#444");
    }
    return Promise.resolve();
}

/**
 * manipulation of energy flowing arrow icons;
 * @param {number} pwr power flowing along arrow (expected pwr >= 0);
 * @param {string} id svg id of arrow to be manipulated;
 * @param {number} thrsh threshold, if power < threshold, no animation is shown;
 * @param {string} sprkcol color of the sparkling star;
 * @param {string} txt content of the text field under the arrow;
 * @param {number} dir direction: (1) top-to-bottom; (2) left-to-right; (3) topleft-to-bottomright
 * @returns
 */
async function AnimArrow(pwr, id, thrsh, sprkcol, txt, dir) { // arrow power flow :: pwr: power, id:svg element id, thrsh: trigger threshold, sprkcol: color sparkle, txt: description text, dir: 1->top-to-bottom 2->left-to-right 3->topleft-to-bottomright
    const p = pwr > thrsh ? pwr : 0;
    const d = p > 0 ? DSPL : NONE;
    let svg = document.getElementById(id).contentDocument;
    if (!NOAN) svg.getElementById("sparkle").setAttribute(FILL, sprkcol);
    svg.getElementById("arrow").setAttribute(DSPL, d);
    if (!NOAN) svg.getElementById("sprk").setAttribute(DSPL, d);
    svg.getElementById(TEXT).setAttribute(DSPL, d);
    svg.getElementById(TEXT).innerHTML = txt + ShowP(p);
    if (NOAN) return Promise.resolve();
    const sc = 1 + SCALE * Math.min(p, PMAX) / PMAX; // the arrow will be scaled to this
    const e = 10 / sc; // arrow start pixel
    const h = 125 / sc; // middle pixel
    const f = 240 / sc; // arrow end pixel
    const fr = "scale(" + sc + ") translate(" + (dir === 1 ? h : e) + "px," + (dir === 2 ? h : e) + "px)";
    const to = SLOW ?
        "scale(" + sc + ") translate(" + (dir === 1 ? h : f) + "px," + (dir === 2 ? h : f) + "px)" :
        "scale(" + sc + ") translate(" + (dir === 1 ? h : f) + "px," + (dir === 2 ? h : f) + "px) rotate(720deg)";
    return svg.getElementById("sprk").animate([{transform: fr}, {transform: to}], {duration: DUR}).finished.then(function(){ svg.getElementById("sprk").setAttribute(DSPL, NONE); }).catch(() => Promise.resolve());
}
