export interface FaqTool {
  key: string;
  name: string;
}

export interface FaqItem {
  id: string;
  q: string;
  a: string;
  remarks: string;
  notes: string;
}

export interface FaqCredentials {
  salt: string;
  hash: string;
}

export const DEFAULT_FAQ_CREDENTIALS: FaqCredentials = {
  salt: "2c78a1fab40663423e7520b93f1da412",
  hash: "a2e249563c737460d41b23ed586ddcc8d8861830a5802b670b3aa032ae77895f"
};

export const DEFAULT_FAQ_TOOLS: FaqTool[] = [
  { key: "usis", name: "USIT" },
  { key: "hrms", name: "HRMS" },
  { key: "ppc", name: "PPC" },
  { key: "emm", name: "EMM" },
  { key: "resolve", name: "Resolve-iX" },
  { key: "spear", name: "Spear-TTiX" },
  { key: "tufftrac", name: "TuffTRAC" },
  { key: "dsi", name: "DSI" },
  { key: "msip", name: "MSIP" },
  { key: "fsis", name: "FSIS" }
];

export const DEFAULT_FAQS_DATA: Record<string, FaqItem[]> = {
  "usis": [
    {
      "id": "usis-1",
      "q": "What is the oil needed to fill/top-up this tool?",
      "a": "101561806 - USIT Oil",
      "remarks": "Usually in 20 liter gray colored can.",
      "notes": "Fill in the FILL PORT only, in Compensating Window, until piston is full and oil bleeds from RV."
    },
    {
      "id": "usis-2",
      "q": "What is the minimum OD of its Centralizer Rollers?",
      "a": "24.5mm",
      "remarks": "Replace Centralizer Roller with p/n P222602 when OD is smaller than 24.5mm.",
      "notes": "Use a caliper and make two measurements 90deg from each other."
    },
    {
      "id": "usis-3",
      "q": "How to check the integrity of the motor?",
      "a": "Check the resistance between UH3-UH8 and UH9-UH10, should be 88Ω +/- 10Ω.",
      "remarks": "Ideally value should be balanced, 1.5Ω difference as per SWI.",
      "notes": "Megger only on UH3 or UH8, >100MΩ. UH10 is shorted to mass."
    },
    {
      "id": "usis-4",
      "q": "What is the Part Number of the SCREW needed to secure USRS and IBC subs?",
      "a": "B016090 is the correct p/n of the screw.",
      "remarks": "Make sure that B016090 ONLY has 4 threads.",
      "notes": "A longer screw will touch the Rotating Housing causing oil leaks or motor failure."
    },
    {
      "id": "usis-5",
      "q": "What is the part number of USIS Centralizer Springs?",
      "a": "P289119 - Leaf spring for USIS centralizer",
      "remarks": "Use proper PPE during removal and installation.",
      "notes": "Different from CMIR-EA/CME-AF"
    },
    {
      "id": "usis-6",
      "q": "What are the p/n of Centralizer Rollers?",
      "a": "P222602-Roller, P296721-Bushing, P284704-Pin, B013313-Spirol pin",
      "remarks": "Replace Centralizer Roller with p/n P222602 when OD is smaller than 24.5mm.",
      "notes": "Check Bushing and Pin wear."
    }
  ],
  "hrms": [
    {
      "id": "hrms-1",
      "q": "What is the oil needed to fill/top-up this tool?",
      "a": "103063625 - DD-27 Oil",
      "remarks": "Usually in 5 gallon yellow colored plastic container",
      "notes": "Fill in the FILL PORT only, bottom part of UH section."
    }
  ],
  "ppc": [
    {
      "id": "ppc-1",
      "q": "What is the oil needed to fill/top-up this tool?",
      "a": "103063625 - DD-27 Oil",
      "remarks": "Usually in 5 gallon yellow colored plastic container",
      "notes": "Fill in the FILL PORT only, marked F in Compensating Housing."
    }
  ],
  "emm": [
    {
      "id": "emm-1",
      "q": "What is the oil needed to fill/top-up this tool?",
      "a": "103063625 - DD-27 Oil",
      "remarks": "Usually in 5 gallon yellow colored plastic container",
      "notes": "Fill in the FILL PORT only, near the Compensating Window."
    }
  ],
  "resolve": [
    {
      "id": "resolve-1",
      "q": "What is the oil needed to fill/top-up this tool?",
      "a": "103063625 - DD-27 Oil",
      "remarks": "Usually in 5 gallon yellow colored plastic container",
      "notes": "Fill in the FILL PORT only, marked F in SPCPS. Use a gauge/dipstick to measure piston level, set at Max."
    },
    {
      "id": "resolve-2",
      "q": "What is the part number of Spirol Pin needed to secure the SPRPS threaded ring to SPTCS?",
      "a": "B016033 - Spirol Pins",
      "remarks": "Install brand new Spirol Pins after every service, DO NOT FORGET TO INSTALL!",
      "notes": "Make sure that these two Spirol Pins are removed before tool disconnection."
    },
    {
      "id": "resolve-3",
      "q": "What is the part number of Retaining Rings needed to install the Coupling Sleeve between SPRPS and SPTCS?",
      "a": "100604349/B044126(preferred) - Retaining Rings",
      "remarks": "Install brand new Retaining Rings after every service, DO NOT FORGET TO INSTALL!",
      "notes": "Use the proper circlip pliers during installation to prevent damage."
    },
    {
      "id": "resolve-4",
      "q": "What is the Torque needed to tighten the Retainer Nut 105003953 at the bottom of SPTCS?",
      "a": "300 in.lbf or 25 ft.lbf of torque is required",
      "remarks": "Lubricate with grease and tighten Retainer Nut using calibrated torque Wrench and SFT 103153024.",
      "notes": "Double check the setting of Torque Wrench before using."
    }
  ],
  "spear": [
    {
      "id": "spear-1",
      "q": "What is the oil needed to fill/top-up this tool?",
      "a": "103063625 - DD-27 Oil",
      "remarks": "Usually in 5 gallon yellow colored plastic container",
      "notes": "Fill in the FILL PORT only, marked F in SPCPS. Use a gauge/dipstick to measure piston level, set at Max."
    },
    {
      "id": "spear-2",
      "q": "What are the resistance values of Spear HV Motors when connected together?",
      "a": "4 drives = 5Ω, 3 drives = 6.67Ω, 2 drives = 10Ω , 1 drive = 18Ω-21Ω",
      "remarks": "Tolerance on resistance readings on multiple drives are +/- 5%.",
      "notes": "Measurement done on SPHYS UH4-UH9, UH4-UH10, and UH9-UH10. Ideally, all readings should be balanced."
    },
    {
      "id": "spear-3",
      "q": "What is the Torque needed to tighten the Wheel Attachment Screw?",
      "a": "82 in.lbf of torque is required",
      "remarks": "Apply Loctite 246 (pn B046992) on Wheel Attachment Screw p/n 103270330 and Gold Grease on the wheels.",
      "notes": "Double check the setting of Torque Wrench and use T30 Torx Bit with SFT 103202446."
    }
  ],
  "tufftrac": [
    {
      "id": "tufftrac-1",
      "q": "What is the oil needed to fill/top-up this tool?",
      "a": "103063625 - DD-27 Oil",
      "remarks": "Usually in 5 gallon yellow colored plastic container",
      "notes": "Fill in the FILL PORT only, marked F in XHMS or XDUS. Check oil level in the XCAS using a gauge/dipstick."
    },
    {
      "id": "tufftrac-2",
      "q": "What is the Torque needed to tighten the Wheel Attachment Screw?",
      "a": "18 ft.lbf of torque is required",
      "remarks": "Wheel Attachment Screw p/n 100586377 and Red High Temp grease on the wheels.",
      "notes": "Torque Wrench is fixed at 18 ft.lbf, use T30 Torx Plus Bit with SFT 100838495."
    }
  ],
  "dsi": [
    {
      "id": "dsi-1",
      "q": "What is the oil needed to fill/top-up this tool?",
      "a": "B015518 - Capella Oil",
      "remarks": "Usually in 1 gallon white colored plastic container",
      "notes": "Usually filled only in FIT room, contact TLM if needed in the field."
    }
  ],
  "msip": [
    {
      "id": "msip-1",
      "q": "What is the oil needed to fill/top-up this tool?",
      "a": "B950546 - Shin-Etsu Oil",
      "remarks": "Usually in 16kg can, reacts with other oils and forms a gluey stuff that plugs holes.",
      "notes": "Fill in the FILL PORT only, near the Compensating Window. Use ONLY DEDICATED Adaptors!"
    }
  ],
  "fsis": [
    {
      "id": "fsis-1",
      "q": "What is the p/n of MS1-4, HD?",
      "a": "101317948 - Low Flow",
      "remarks": "Check actual OD, usually light blue.",
      "notes": "Keep in mind the orientation when installing in the support."
    },
    {
      "id": "fsis-2",
      "q": "What is the p/n of MS0, HD?",
      "a": "101305786 - Low Flow",
      "remarks": "Check actual OD, usually dark blue.",
      "notes": "Keep in mind the orientation when installing in the support."
    },
    {
      "id": "fsis-3",
      "q": "What is the p/n of O-probe",
      "a": "P787564 - O-probe",
      "remarks": "Check tip.",
      "notes": "Keep the protector installed."
    },
    {
      "id": "fsis-4",
      "q": "What is the p/n of E-probe",
      "a": "100089331 - E-probe",
      "remarks": "Check tip.",
      "notes": "Keep the protector installed."
    }
  ]
};
