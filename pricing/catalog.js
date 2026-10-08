/* Retail and service columns: April 1, 2026 partner master sheet. USD. */
(function(root){
const catalog={
  "bbm2": {
    "id": "bbm2",
    "code": "CPB1030575",
    "name": "Bourg Booklet Maker BBM 40/60+ (Stitch-Fold) with 2 Hohner Stitch Heads and GUI (Bourg Box not included)",
    "price": 77131.43,
    "standalone": 3650,
    "system": 3650,
    "tariffable": true,
    "kind": "hardware"
  },
  "bbm4": {
    "id": "bbm4",
    "code": "CPB1030576",
    "name": "Bourg Booklet Maker BBM 40/60+ (Stitch-Fold) with 4 Hohner Stitch Heads and GUI (Bourg Box not included)",
    "price": 97896.3,
    "standalone": 3650,
    "system": 3650,
    "tariffable": true,
    "kind": "hardware"
  },
  "bme2": {
    "id": "bme2",
    "code": "9584892-AF",
    "name": "Bourg Booklet Maker BM-e (Stitch-Fold) with 2 Hohner Stitch Heads and GUI (Bourg Box not included)",
    "price": 70362.96,
    "standalone": 3650,
    "system": 3650,
    "tariffable": true,
    "kind": "hardware"
  },
  "bme4": {
    "id": "bme4",
    "code": "9584894-AF",
    "name": "Bourg Booklet Maker BM-e (Stitch-Fold) with 4 Hohner Stitch Heads and GUI (Bourg Box not included)",
    "price": 79540.74,
    "standalone": 3650,
    "system": 3650,
    "tariffable": true,
    "kind": "hardware"
  },
  "bsf": {
    "id": "bsf",
    "code": "9583634-AF",
    "name": "BSF Bourg Sheet Feeder 26\" Right to Left paper path direction (includes Universal 26\" Air Table Cart)",
    "price": 48658.91,
    "standalone": 3650,
    "system": 650,
    "tariffable": true,
    "kind": "hardware"
  },
  "bsfLR": {
    "id": "bsfLR",
    "code": "9583632-AF",
    "name": "BSF Bourg Sheet Feeder 26\" Left to Right paper path direction (includes Universal 26\" Air Table Cart)",
    "price": 48658.91,
    "standalone": 3650,
    "system": 650,
    "tariffable": true,
    "kind": "hardware"
  },
  "ifb": {
    "id": "ifb",
    "code": "9592434-AF",
    "name": "26\" BSF IFB Manual Feed and Reject Tray with Docking (Mandatory with BCM-e) R to L and L to R",
    "price": 4693.62,
    "standalone": 3650,
    "system": 0,
    "tariffable": true,
    "kind": "hardware"
  },
  "bsfUI": {
    "id": "bsfUI",
    "code": "9592056-AF",
    "name": "GUI for BSF",
    "price": 9275.94,
    "standalone": 3650,
    "system": 0,
    "tariffable": true,
    "kind": "hardware"
  },
  "plate": {
    "id": "plate",
    "code": "9592082-AF",
    "name": "Registration plate and jacks for BSF 26\"",
    "price": 3061.06,
    "standalone": 3650,
    "system": 0,
    "tariffable": true,
    "kind": "hardware"
  },
  "bpm": {
    "id": "bpm",
    "code": "CPB0001107",
    "name": "Bourg Preparation Module BPM Main",
    "price": 37103.74,
    "standalone": 3650,
    "system": 1650,
    "tariffable": true,
    "kind": "hardware"
  },
  "bleed": {
    "id": "bleed",
    "code": "CPB0001110",
    "name": "Bourg Preparation Module BPM Bleed/Trim",
    "price": 11873.2,
    "standalone": 3650,
    "system": 650,
    "tariffable": true,
    "kind": "hardware"
  },
  "crease": {
    "id": "crease",
    "code": "CPB0001108",
    "name": "Bourg Preparation Module BPM Crease",
    "price": 14841.5,
    "standalone": 3650,
    "system": 650,
    "tariffable": true,
    "kind": "hardware"
  },
  "cut": {
    "id": "cut",
    "code": "CPB0001111",
    "name": "Bourg Preparation Module BPM Cut",
    "price": 14841.5,
    "standalone": 3650,
    "system": 650,
    "tariffable": true,
    "kind": "hardware"
  },
  "fold": {
    "id": "fold",
    "code": "CPB0001112",
    "name": "Bourg Preparation Module BPM Fold",
    "price": 16882.2,
    "standalone": 3650,
    "system": 650,
    "tariffable": true,
    "kind": "hardware"
  },
  "bottomPerf": {
    "id": "bottomPerf",
    "code": "CPB0001146",
    "name": "Bourg Preparation Module BPM Bottom Micro-Perforation",
    "price": 14655.98,
    "standalone": 3650,
    "system": 650,
    "tariffable": true,
    "kind": "hardware"
  },
  "topPerf": {
    "id": "topPerf",
    "code": "CPB0001147",
    "name": "Bourg Preparation Module BPM Top Micro-Perforation",
    "price": 14655.98,
    "standalone": 3650,
    "system": 650,
    "tariffable": true,
    "kind": "hardware"
  },
  "gui": {
    "id": "gui",
    "code": "CPB0000222",
    "name": "BPM GUI",
    "price": 10574.57,
    "standalone": 3650,
    "system": 0,
    "tariffable": true,
    "kind": "hardware"
  },
  "slot": {
    "id": "slot",
    "code": "CPB0001113",
    "name": "BPM 1 Extra Slot",
    "price": 8843.06,
    "standalone": 3650,
    "system": 0,
    "tariffable": true,
    "kind": "hardware"
  },
  "slot2": {
    "id": "slot2",
    "code": "CPB0001114",
    "name": "BPM 2 Extra Slots",
    "price": 8843.06,
    "standalone": 3650,
    "system": 0,
    "tariffable": true,
    "kind": "hardware"
  },
  "bpmCable": {
    "id": "bpmCable",
    "code": "9423825",
    "name": "BPM Connection Cable",
    "price": 748.26,
    "standalone": 3650,
    "system": 0,
    "tariffable": true,
    "kind": "hardware"
  },
  "dock": {
    "id": "dock",
    "code": "9592457",
    "name": "Docking Plate for BM-e / BBM",
    "price": 673.43,
    "standalone": 3650,
    "system": 0,
    "tariffable": true,
    "kind": "hardware",
    "note": "System installation is blank in one master row and zero in the duplicate BM-e row. Confirm if additional service is required."
  },
  "unlimited": {
    "id": "unlimited",
    "code": "CPB0001317",
    "name": "Bourg Booklet Maker BBM 40 to 60+ Upgrade  Unlimited",
    "price": 14285.71,
    "standalone": null,
    "system": null,
    "tariffable": false,
    "kind": "license",
    "note": "Master list uses CPB0001317; Visual Edge quote uses CPB0001373 for the same Unlimited license. Confirm order code. No tariff."
  },
  "bse": {
    "id": "bse",
    "code": "CPB1027626",
    "name": "Bourg Square Edge BSE (for BBM only)",
    "price": 26849.11,
    "standalone": 3650,
    "system": 650,
    "tariffable": true,
    "kind": "hardware"
  },
  "trim": {
    "id": "trim",
    "code": "CPB1027815",
    "name": "Bourg Booklet Maker BBM (Face Trim)",
    "price": 32189.47,
    "standalone": 3650,
    "system": 650,
    "tariffable": true,
    "kind": "hardware"
  },
  "bmeBse": {
    "id": "bmeBse",
    "code": "CPB0000659",
    "name": "Bourg Square Edge BSE",
    "price": 34011.76,
    "standalone": 3650,
    "system": 650,
    "tariffable": true,
    "kind": "hardware"
  },
  "bmeTrim": {
    "id": "bmeTrim",
    "code": "9585539-AF",
    "name": "Bourg Booklet Maker Front-Trimming Unit for Bourg BM-e",
    "price": 30232.68,
    "standalone": 3650,
    "system": 650,
    "tariffable": true,
    "kind": "hardware"
  },
  "box": {
    "id": "box",
    "code": "9433340-AF",
    "name": "Bourg Box Communication Interface",
    "price": 5936.6,
    "standalone": 3650,
    "system": 0,
    "tariffable": true,
    "kind": "hardware"
  },
  "eva": {
    "id": "eva",
    "code": "9580180-AF",
    "name": "Bourg Binder BB3002 EVA (BBR and Dust Extraction Kit not included)",
    "price": 91574.26,
    "standalone": 3650,
    "system": 3650,
    "tariffable": true,
    "kind": "hardware"
  },
  "pur": {
    "id": "pur",
    "code": "9580275-AF",
    "name": "Bourg Binder BB3002 PUR-C (BBR and Dust Extraction Kit not included)",
    "price": 133059.59,
    "standalone": 4650,
    "system": 4650,
    "tariffable": true,
    "kind": "hardware"
  },
  "bbl": {
    "id": "bbl",
    "code": "9580274-AF",
    "name": "Bourg Book Loader BBL for BB3002 (not including BB3002 upgrade kit)",
    "price": 40474.0,
    "standalone": 3650,
    "system": 650,
    "tariffable": true,
    "kind": "hardware"
  },
  "bbc": {
    "id": "bbc",
    "code": "9580273-AF",
    "name": "Bourg Book Compiler BBC for BB3002 (not including BB3002 upgrade kit)",
    "price": 42929.03,
    "standalone": 3650,
    "system": 650,
    "tariffable": true,
    "kind": "hardware"
  },
  "bbr": {
    "id": "bbr",
    "code": "9580184-AF",
    "name": "Bourg Book Reception BBR Conveyor for BB3002",
    "price": 8255.58,
    "standalone": 3650,
    "system": 0,
    "tariffable": true,
    "kind": "hardware"
  },
  "upgrade": {
    "id": "upgrade",
    "code": "9592124",
    "name": "Upgrade Kit to connect BBL/BBC with BB3002 (Only needed for BB3002 with S/N between xxxxx666 and xxxx1108 and without TAG #71)",
    "price": 7652.65,
    "standalone": 3650,
    "system": 0,
    "tariffable": true,
    "kind": "hardware",
    "note": "Required only for BB3002 serial numbers between xxxxx666 and xxxx1108 without TAG #71. Check serial number before ordering."
  },
  "dust": {
    "id": "dust",
    "code": "9591137",
    "name": "Basic Paper Dust Extraction Kit for BB3002 (230VAC)",
    "price": 2244.78,
    "standalone": 3650,
    "system": 0,
    "tariffable": true,
    "kind": "hardware"
  },
  "130": {
    "id": "130",
    "code": "9580311",
    "name": "CMT130 TC Central 3 Side 1 Knife Trimming Base (208/230V, 60Hz)",
    "price": 68000,
    "standalone": 3650,
    "system": 3650,
    "tariffable": false,
    "kind": "hardware"
  },
  "330": {
    "id": "330",
    "code": "DTCMC330TCB",
    "name": "CMT330 TCB Central Landscape 3 Side 3 Knife Trimming Base (External Waste) (208/230V, 60Hz)",
    "price": 120378.15,
    "standalone": 3650,
    "system": 3650,
    "tariffable": false,
    "kind": "hardware"
  },
  "130con": {
    "id": "130con",
    "code": "9580314",
    "name": "TC In-Line Conveyor",
    "price": 14301.68,
    "standalone": 3650,
    "system": 650,
    "tariffable": false,
    "kind": "hardware"
  },
  "130cool": {
    "id": "130cool",
    "code": "9580313",
    "name": "TC Cooling Elevator",
    "price": 15059.24,
    "standalone": 3650,
    "system": 650,
    "tariffable": false,
    "kind": "hardware"
  },
  "130stack": {
    "id": "130stack",
    "code": "9580319",
    "name": "TC Verticle Stacker",
    "price": 10990.25,
    "standalone": 3650,
    "system": 650,
    "tariffable": false,
    "kind": "hardware"
  },
  "330con": {
    "id": "330con",
    "code": "DT56631TCLB",
    "name": "TCB In-Line Conveyor Landscape (Wide)",
    "price": 16088.15,
    "standalone": 3650,
    "system": 650,
    "tariffable": false,
    "kind": "hardware"
  },
  "330cool": {
    "id": "330cool",
    "code": "DT56431TCLB",
    "name": "TCB In-Line Elevator Landscape",
    "price": 15398.71,
    "standalone": 3650,
    "system": 650,
    "tariffable": false,
    "kind": "hardware"
  },
  "330stack": {
    "id": "330stack",
    "code": "DT58100TCLB",
    "name": "TCB Verticle Stacker Landscape",
    "price": 14489.76,
    "standalone": 3650,
    "system": 650,
    "tariffable": false,
    "kind": "hardware"
  },
  "wagon": {
    "id": "wagon",
    "code": "DT41058",
    "name": "External Waste Wagon CMT 130/330 TC (1  required per machine)",
    "price": 430.59,
    "standalone": 0,
    "system": 0,
    "tariffable": false,
    "kind": "hardware"
  },
  "bins": {
    "id": "bins",
    "code": "DT56990",
    "name": "Waste Bin (2  required per machine)",
    "price": 155.29,
    "standalone": 0,
    "system": 0,
    "tariffable": false,
    "kind": "hardware"
  },
  "connex": {
    "id": "connex",
    "code": "CPB0000684",
    "name": "BB3002–CMT Connex cable",
    "price": 849.95,
    "standalone": null,
    "system": null,
    "tariffable": true,
    "kind": "hardware",
    "note": "Cable retail confirmed by revised Ricoh quote; installation rate is not listed. Included with CMT system installation, confirm standalone service."
  }
};
if(typeof module!=="undefined")module.exports=catalog;else root.BourgCatalog=catalog;
})(globalThis);
