export interface CountryFirepower {
    airforce: { combatAircraft: number; };
    army: { tanks: number; };
    navy: { activePlatforms: number; };
    nuclear: { warheads: number; };
}

export const COUNTRY_FIREPOWER: Record<string, CountryFirepower> = {
    India: {
        airforce: { combatAircraft: 686 },
        army: { tanks: 4740 },
        navy: { activePlatforms: 295 },
        nuclear: { warheads: 160 }
    },
    Pakistan: {
        airforce: { combatAircraft: 387 },
        army: { tanks: 3742 },
        navy: { activePlatforms: 114 },
        nuclear: { warheads: 170 }
    },
    China: {
        airforce: { combatAircraft: 3304 },
        army: { tanks: 4950 },
        navy: { activePlatforms: 730 },
        nuclear: { warheads: 500 }
    },
    USA: {
        airforce: { combatAircraft: 5209 },
        army: { tanks: 5500 },
        navy: { activePlatforms: 470 },
        nuclear: { warheads: 5244 }
    },
    Russia: {
        airforce: { combatAircraft: 4182 },
        army: { tanks: 14777 },
        navy: { activePlatforms: 598 },
        nuclear: { warheads: 5889 }
    },
    Israel: {
        airforce: { combatAircraft: 340 },
        army: { tanks: 2200 },
        navy: { activePlatforms: 67 },
        nuclear: { warheads: 90 }
    },
    Iran: {
        airforce: { combatAircraft: 551 },
        army: { tanks: 1996 },
        navy: { activePlatforms: 100 },
        nuclear: { warheads: 0 }
    },
    UK: {
        airforce: { combatAircraft: 219 },
        army: { tanks: 213 },
        navy: { activePlatforms: 75 },
        nuclear: { warheads: 225 }
    },
    France: {
        airforce: { combatAircraft: 226 },
        army: { tanks: 222 },
        navy: { activePlatforms: 118 },
        nuclear: { warheads: 290 }
    },
    Taiwan: {
        airforce: { combatAircraft: 286 },
        army: { tanks: 1010 },
        navy: { activePlatforms: 92 },
        nuclear: { warheads: 0 }
    }
};
