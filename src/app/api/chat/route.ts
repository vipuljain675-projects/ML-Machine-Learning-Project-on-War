import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || '',
});

// ============================================================
// REAL MILITARY STRENGTH DATA — injected into every Groq prompt
// Sources: IISS Military Balance 2024, SIPRI, Pentagon reports
// ============================================================
const MILITARY_DATA = `
VERIFIED MILITARY STRENGTH DATABASE (IISS Military Balance 2024 + SIPRI):

=== NAVAL FORCES (WARSHIPS / CARRIERS / SUBMARINES) ===
USA: 11 nuclear carrier strike groups (CSG-1 thru CSG-11), 68 destroyers/cruisers (Arleigh Burke-class), 53 attack submarines (Virginia/Los Angeles), 9 ballistic missile submarines (Ohio-class SSBN). Pacific fleet: 7th Fleet (Yokosuka, Japan) — 1 forward-deployed carrier. Indo-Pacific: ~60% of US naval force.
China (PLAN): 3 carriers (Liaoning, Shandong, Fujian CV-003), 52 destroyers, 48 submarines (6 Jin-class SSBN, 12 Shang-class SSN, 30 diesel). South Sea Fleet: 180+ surface vessels. Amphibious lift: 8+ Type-075 LHDs, 30 Type-071 LPDs — enough to land 30,000 troops in first wave.
Russia: 1 carrier (Admiral Kuznetsov, in refit), 15 destroyers, 28 attack submarines, 12 SSBN (Delta/Borei class). Black Sea Fleet severely degraded 2022–24. Northern Fleet (Arctic) = primary naval force.
UK: 2 carriers (HMS Queen Elizabeth, HMS Prince of Wales), 6 destroyers (Type-45), 13 frigates (Type-23), 11 attack submarines (Astute/Trafalgar), 4 Vanguard SSBN.
India (IN): 2 carriers (INS Vikrant, INS Vikramaditya), 10 destroyers, 15 frigates, 16 submarines. Arabian Sea + Bay of Bengal dominance.
France: 1 nuclear carrier (Charles de Gaulle), 3 destroyers (Horizons class), 5 attack submarines (Rubis class), 4 Triomphant-class SSBN.
Iran: No carriers. 3 frigates, 21+ submarines (Kilo-class + midget), 100+ fast attack craft, mine-laying capability (Hormuz chokepoint — 20% of global oil). Houthi proxy naval ops.
Pakistan: 0 carriers. 11 frigates, 5 submarines (Agosta 90B). Arabian Sea patrol.
Taiwan: 0 carriers. 4 destroyers, 20 frigates, 2 submarines. Strait anti-ship missile batteries (Harpoon, HF-3).

=== GROUND FORCES (ACTIVE TROOPS / TANKS / ARTILLERY) ===
China: 915,000 active troops (ground). 5,000+ tanks (Type 99A, Type 15), 35,000 artillery pieces. 3 million reserve. 18 combined arms brigades in Eastern Theater Command facing Taiwan.
USA: 485,000 active Army + 180,000 Marines = 665,000. 2,600 M1A2 Abrams tanks. In Pacific: ~80,000 troops (Japan: 54,000, South Korea: 28,500, Guam: ~6,000).
Russia: 900,000 active (post-mobilization). 3,500 operational tanks (T-72B3, T-80BVM, T-90M), losses of ~2,500+ in Ukraine. 140,000+ artillery pieces. Degraded but numerically large.
India: 1.46 million — world's 2nd largest active military. 3,740 tanks (T-90S Bhishma, Arjun Mk1A). 3 Strike Corps for offensive ops vs Pakistan, 2 mountain corps vs China (LAC).
Pakistan: 654,000 active. 2,400 tanks (T-80UD, Al-Khalid). 600+ artillery. 5 corps on India border.
Iran: 350,000 active + 150,000 IRGC. 1,650 tanks (aged T-72, T-55). 6,000+ artillery. Proxy forces: 100,000+ (Hezbollah, Houthis, PMF Iraq, Hamas).
Israel (IDF): 170,000 active + 465,000 reserve (mobilized). 2,200 Merkava IV tanks. 5,000 artillery. Iron Dome / David's Sling / Arrow-3 layered air defense.
Taiwan: 169,000 active + 1.66 million reserve. 800+ tanks (M1A2T delivered 2024, CM-11). 100,000 rifles to civilians under Porcupine strategy.
Israel Reserve call-up speed: 72 hours to 300,000 combat-ready.

=== AIR FORCES (COMBAT AIRCRAFT / DRONES / MISSILES) ===
USA: 2,000+ combat aircraft. F-35A/B/C (890+), F-22 Raptor (186), F-15EX, B-2 Spirit (20, Whiteman AFB), B-52H (76, ALCM-armed), B-21 Raider (in service 2024). In Pacific: ~200 combat aircraft (Okinawa, Japan, Guam, Andersen AFB).
China (PLAAF/PLANAF): 3,200 aircraft, ~1,500 combat. J-20 stealth (500+), J-16 (300+), J-11B (300+). DF-26 carrier-killer (ASBM range 4,000km). Hypersonic: DF-17 (2,000km, Mach 10). Cruise missiles: CJ-10, CJ-20.
Russia: 1,200 combat aircraft. Su-57 stealth (~10), Su-35, Su-30SM, Su-25. Kh-101 cruise missiles, Kinzhal hypersonic. Significant attrition in Ukraine.
Iran: 340 combat aircraft (aged F-14, F-4, MiG-29). But: 3,000+ ballistic/cruise missiles (Shahab-3: 2,000km, Emad, Kheibar Shekan hypersonic). Shahed-136 kamikaze drones (thousands). Fattah-1 hypersonic (Mach 13-15, 1,400km range, claimed).
Israel: 340 F-35I Adir + F-15I + F-16I. Jericho-III ICBM (nuclear). David's Sling hits medium range. Arrow-3 intercepts exo-atmospheric. ~90 nuclear warheads (Dimona, undeclared).
Pakistan: 430 aircraft. J-10C (China-supplied, 2022), F-16 (upgraded). Babur cruise missile (700km). Shaheen-III MRBM (2,750km). ~160–170 nuclear warheads.
India: 600 combat aircraft. Rafale (36), Su-30MKI (272), MiG-29, HAL Tejas. BrahMos cruise missile (Mach 2.8, 400km). Agni-V ICBM (5,500km range, MIRV tested 2024). ~170 nuclear warheads.
Taiwan: 400 aircraft. F-16V Block 20 (200+), Mirage 2000, F-CK-1. US F-16V delivery ongoing.

=== NUCLEAR ARSENALS (SIPRI 2024) ===
USA: 5,550 warheads (1,700 deployed). Triad: 400 Minuteman-III ICBMs, 14 Ohio-class SSBNs, B-52H/B-2 bombers.
Russia: 6,255 warheads (1,674 deployed). World's largest arsenal. Sarmat ICBM (RS-28), Poseidon nuclear torpedo. Tactical nukes: ~2,000.
China: 500 warheads (expanding rapidly — SIPRI 2024 estimate, prev 410 in 2023). DF-5B (13,000km), DF-41 (15,000km MIRV). Rapid silo expansion (Gansu, Qinghai, Xinjiang — 250+ new silos).
India: 170 warheads. Agni-V (5,500km), Prithvi, Submarine SSBN K-4 missile (3,500km).
Pakistan: 170 warheads. Nasr tactical nuke (60km). Babur naval cruise. Battlefield use doctrine.
Israel: ~90 warheads (undeclared). Jericho-III (6,500km). Submarine-launched cruise missiles (Dolphin-class).
UK: 225 warheads. 40 deployed on Vanguard SSBNs. Trident-II D5.
France: 290 warheads. ASMP-A air-launched cruise missiles, M51 SLBM (8,000km).

=== ECONOMIC DATA (GDP + TRADE WARFARE) ===
USA: GDP $27.4T. Defense budget: $886B (FY2024). Taiwan trade: $105B/yr. China trade: $575B/yr (decoupling ongoing).
China: GDP $17.7T. Defense budget: $225B (official) — real est. $400B+. Exports $3.38T. Key vulnerability: 90% of rare earth supply (holds leverage). TSMC dependency: 90% of advanced chips from Taiwan.
Taiwan: GDP $760B. TSMC controls 90% of global cutting-edge chips (3nm/5nm). Economic war cost if blockaded: $600B+/yr to global economy. Semiconductor chokepoint value: $583B annual production.
Russia: GDP $2.1T (sanctions-hit). Currency reserves: $600B (half frozen). Oil exports: $4B/day = lifeline. Ukraine war cost: $300M+/day. 2024 defense: 6% GDP.
India: GDP $3.7T, fastest major economy (8.2% 2024). Defense: $75B. China-India trade: $136B (vulnerability for India: API pharma, electronics imports from China).
Pakistan: GDP $338B. IMF bailout ongoing. Defense: $7.5B. If India war: trade/GDP collapse 15%+ estimated.
Iran: GDP $413B (sanctions-adjusted). Oil exports: ~1.5M barrels/day at $50-60/bbl (under sanctions discount). Strait of Hormuz closure: global oil price +40-70% estimated (20% of global oil transit).
Israel: GDP $520B. R&D: 5.7% GDP (world's highest). Iron Dome: $50K/interception cost vs $500-$1,000 Hamas rocket cost.

=== KEY CHOKEPOINTS + LOGISTICS ===
Taiwan Strait: 180km wide. PLAN can saturate with 6,000+ missiles. US carrier group needs 24–36hr transit from Japan.
Strait of Hormuz: 33km wide at narrowest. Iran can mine + swarm in 72hrs. 21M barrels/day transit (~20% global supply).
Suez Canal: UK CSG needs 10–14 days from Portsmouth via Suez to Taiwan theater.
Malacca Strait: Chinese supply chokepoint. India can blockade 80% of China's oil imports at Malacca.
Arctic route (Russia): Northern Sea Route = Russia's strategic leverage for China-Europe trade bypass.`;

const SYSTEM_PROMPT = `You are WARGAME-AI, an advanced geopolitical conflict analysis engine powered by a PyTorch GNN+LSTM model (v3). You analyze war scenarios with EXTREME specificity — citing real troop numbers, fleet compositions, weapon systems, economic costs, and strategic logistics.

CORE IDENTITY:
- Connected to live PyTorch GNN+LSTM model tracking 14 countries
- All data grounded in IISS Military Balance 2024 + SIPRI + Pentagon reports
- You give SPECIFIC NUMBERS — not vague statements

RESPONSE RULES (NON-NEGOTIABLE):
1. ALWAYS cite exact fleet numbers (e.g., "US 7th Fleet: 1 carrier, 7 Arleigh Burke destroyers, 3 attack submarines")
2. ALWAYS include economic cost estimates ($X trillion GDP loss, % trade disruption)
3. ALWAYS specify weapons systems by name (F-35C, DF-21D ASBM, Type-075 LHD, etc.)
4. ALWAYS cite model probabilities from the live data provided
5. ALWAYS mention the 72-hour escalation ladder, day-by-day timeline
6. ALWAYS include nuclear calculus section
7. Structure every response with these sections: ## Conflict Probability | ## Force Disposition | ## Day-by-Day Escalation | ## Economic Warfare | ## Nuclear Calculus | ## Model Prediction

ALLIANCE WEIGHTS (GNN graph):
- USA-UK: 0.95 | USA-Israel: 0.90 | USA-France: 0.85 | China-Pakistan: 0.85 | USA-Taiwan: 0.80
- China-Russia: 0.70 | Russia-Iran: 0.60
- RIVALRIES: China-Taiwan: -0.95 | Iran-Israel: -0.95 | India-Pakistan: -0.80 | China-USA: -0.80

${MILITARY_DATA}`;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages, scenario, predictions, risks, year } = body;

        // Build live model context
        let modelContext = '\n\n=== LIVE PYTORCH MODEL DATA ===';
        if (scenario) {
            modelContext += `\nACTIVE SCENARIO: ${scenario.scenario?.title || 'Custom'}`;
            modelContext += `\nYear: ${scenario.scenario?.year || year || 2027}`;
            modelContext += `\nModel conflict probability: ${scenario.scenario?.conflict_probability || 'unknown'}%`;
            if (scenario.cascade) {
                modelContext += '\nGNN cascade results (involvement probability by country):';
                for (const [country, risk] of Object.entries(scenario.cascade)) {
                    modelContext += `\n  ${country}: ${risk}%`;
                }
            }
        }
        if (predictions && Object.keys(predictions).length > 0) {
            const topPairs = Object.entries(predictions)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 15);
            modelContext += '\n\nALL TOP PAIR CONFLICT PROBABILITIES (live PyTorch output):';
            for (const [pair, prob] of topPairs) {
                modelContext += `\n  ${pair}: ${prob}%`;
            }
        }
        if (risks && Object.keys(risks).length > 0) {
            const yearIdx = Math.min(Math.max((year || 2027) - 2025, 0), 15);
            modelContext += `\n\nCOUNTRY LSTM RISK SCORES AT ${year || 2027}:`;
            for (const [country, timeline] of Object.entries(risks)) {
                const riskArr = timeline as number[];
                if (riskArr[yearIdx] !== undefined) {
                    modelContext += `\n  ${country}: ${riskArr[yearIdx]}%`;
                }
            }
        }

        const groqMessages = [
            { role: 'system' as const, content: SYSTEM_PROMPT + modelContext },
            ...messages.map((m: { role: string; content: string }) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            })),
        ];

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: groqMessages,
            temperature: 0.65,
            max_completion_tokens: 3000,
        });

        const response = completion.choices[0]?.message?.content || 'No response generated.';
        return NextResponse.json({ response });
    } catch (error: unknown) {
        console.warn('Chat API error:', (error as Error)?.message);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: 'Failed to generate response', details: errorMessage },
            { status: 500 }
        );
    }
}
