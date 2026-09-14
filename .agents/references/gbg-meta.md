# Guild Battlegrounds Overview

**Guild Battlegrounds (GBG)** is a large-scale, cross-platform guild feature in Forge of Empires where 5 to 8 guilds compete on a shared map over an **11-day season**, followed by a **3-day break** 1, 2\. Participation requires unlocking the **Military Tactics** technology in the Iron Age and being a member of a guild 3, 4\. Seasons alternate between two main maps: the **Volcano Archipelago** (offering Statue of Honor and Road to Victory rewards) and the **Waterfall Archipelago** (offering The Great Elephant and Iridescent Garden rewards) 5-8.

### 1\. Map Expansion & Sector Conquest

* **Starting Base & Adjacency**: Each guild begins at an un-capturable **Headquarters (HQ)** at the map's edge and can only attack or negotiate provinces directly adjacent to sectors they already own 9-12.  
* **Encounters & Advances**: Progress is made through battles (1 advance) or negotiations (2 advances) scaled to the individual player's era 13, 14\. The total advances needed to capture a sector scale by league, from **20 advances in Copper** up to **100–110 advances in Diamond** 14\.  
* **4-Hour Lockdown**: Capturing a sector immediately places it under a **4-hour protection lock** during which no other guild can attack it 14, 15\. Any competing guild that was pushing that sector loses **50% of their accumulated advances** 13\.  
* **Victory Points (VP)**: Guild rankings are determined by VP collected automatically at the top of every hour 16, 17\. Sectors closer to the center yield higher VP (Ring 1 gives 100–200 VP/hr vs. Outer Ring 4 giving 10–40 VP/hr), multiplied by the guild's league level (Copper 10% up to Diamond 100%) 18-21.  
* **Guild Strategy**: Competitive guilds frequently use **sector pinning** (halting advances at e.g. 190/200 or 210/220) to block enemy expansion, and time sector captures 1–2 minutes prior to the top of the hour to guarantee 5 hourly collections during the 4-hour lock 22-24.

### 2\. Personal Difficulty: Attrition & Daily Trials

* **Attrition Escalation**: Every successful encounter has a chance to raise personal attrition, increasing defending army combat stats and negotiation costs until resetting to 0 at midnight server time 21, 25\.  
* **Personal Trial Levels**: Players can independently select a daily **Trial Level (1 to 50\)** 26, 27\. Higher trial levels apply stronger difficulty modifiers (enemy army boost modifiers, boost multipliers, critical hit chances, and negotiation multipliers) in exchange for a higher **Rank Points multiplier** and increased **Battleground Coin** payouts 28-32.

### 3\. Province Buildings & Treasury Fortifications

* **Building Construction**: Guild members with the **Battleground Officer** role can construct up to 3 province buildings per sector using randomized guild treasury goods based on the eras present in the guild 33-36.  
* **Structure Types**: Officers can build **Watchtowers**, **Field Camps**, **Guild Barracks**, **Field Outposts**, **Garrisons**, **Fortresses**, or defensive **Traps and Decoys** (which force attacking enemies to suffer double attrition) 104, 105, 106, 232–241.  
* **Attrition Avoidance**: Attrition-reducing fortifications cap at an **80% chance** to avoid gaining attrition 7, 37, 38\. If an enemy conquers a province while a building is under construction, there is a **50% chance** the building is destroyed 39, 40\.

### 4\. League System & Special Matchmaking

* **League Ladders**: Guilds rank across **Copper, Silver, Gold, Platinum, and Diamond leagues** based on League Points (0 to 1,000 LP / MMR) earned or lost according to final season placement 41-43.  
* **Special Season Mode**: In the **3rd and 6th seasons** of each Championship, top Diamond League guilds are placed into a specialized competitive pool matched in 4-guild increments, where no League Points are deducted regardless of final placement 44, 45\.

### 5\. Currencies & Championship Rewards

* **Battleground Coins**: Players earn **Silver, Gold, and Platinum coins** from encounters and end-of-season reward packages across all leagues 28, 29, 46\. These permanent coins can be spent in the Common and Uncommon Battleground Stores, subject to storage limits (200,000 Silver, 200,000 Gold, 300,000 Platinum) 47-51.  
* **Championship Rewards**: Winning 3 Diamond League Battlegrounds during a Championship unlocks Level 1 (and 5 wins unlocks Level 2\) of exclusive flagship buildings such as the **Tower of Champions**, **Intelligence Bureau**, **Steamworks Depot**, **Steelport Warship**, or **Fort Imperial**, as well as accessible minor support structures (e.g. Rail Howitzer, Steelport Silo, Intelligence Relay) 52-60.

### 6\. Guild Battlegrounds Attrition & Difficulty Formulas

In Guild Battlegrounds, the final difficulty of any encounter (combat or negotiation) is determined by combining your **personal Attrition Level** with your selected **Trial Level (1 to 50\)** 1, 2\.

#### Combat Difficulty Formula

\\\\\\mathbf{\\text{Total Enemy Army Boost}} \= (\\text{Base Enemy Army Boost} \\times \\text{Enemy Army Boost Multiplier}) \+ \\text{Enemy Army Boost Modifier}\\\\ 2

* **Base Enemy Army Boost**: Determined directly by your current **Attrition Level** 2\. It starts at **0%** (Attrition 0\) 3, increases to **11%** (Attrition 10\) 3, **239%** (Attrition 40\) 3, **1,999%** (Attrition 100\) 3, and caps at **5,989%** at Attrition 150 3, 4\.  
* **Trial Modifiers** (applied based on your daily Trial selection 1–50) 5, 6:  
* **Enemy Army Boost Modifier**: Adds a flat **\+0%** (Trial 1\) up to **\+4,475%** (Trial 50\) 6\.  
* **Enemy Army Boost Multiplier**: Scales from **1.0×** (Trials 1–2) up to **4.0×** (Trial 50\) 6\.  
* **Enemy Critical Hit Chance**: Adds a base probability ranging from **0%** (Trials 1–10) up to **50.00%** (Trial 50\) for enemy units to deal 150% damage 5, 6\.

#### Negotiation Difficulty Formula

\\\\\\mathbf{\\text{Total Negotiation Difficulty}} \= \\text{Base Negotiation Difficulty} \\times \\text{Negotiations Multiplier}\\\\ 7

* **Base Negotiation Difficulty**: Determined by your Attrition Level (e.g., multiplier of **1×** for Attrition 0–10 3, **3×** for Attrition 16–22 3, up to **37×** at Attrition 150\) 3, 4\.  
* **Negotiation Multiplier**: Applied from your Trial Level, scaling from **1.0×** (Trials 1–2) up to **4.0×** (Trial 50\) 6\.  
* **Rank Points Multiplier**: Selecting higher Trial Levels scales your personal Rank Points payout per encounter from **2.0×** (Trial 1\) up to **7.0×** (Trial 50\) 6, 8\.

### 7\. Province Building Costs & League Discount Multipliers

Province buildings cost **Guild Treasury Goods** drawn randomly from eras present in your guild at the start of the season (weighted by member count per era) 9, 10\.

#### Base Construction Costs (Diamond League / 100% Cost)

* **Field Camps (Attrition Avoidance & VP Multipliers)**:  
* **Basic Field Camp** (20% Attrition Avoidance, \+5% Advances, \+15% VP): **2,900 Goods** 11, 12  
* **Regular Field Camp** (40% Attrition Avoidance, \+10% Advances, \+30% VP): **5,200 Goods** 11, 12  
* **Advanced Field Camp** (60% Attrition Avoidance, \+30% Advances, \+100% VP): **7,000 Goods** 11, 13, 14  
* **Guild Barracks (Attrition Avoidance & Defense Boosts)**:  
* **Basic Barracks** (20% Attrition Avoidance, \+5% Advances): **2,800 Goods** 11, 14  
* **Regular Barracks** (40% Attrition Avoidance, \+10% Advances): **5,000 Goods** 11, 15  
* **Advanced Barracks** (60% Attrition Avoidance, \+30% Advances): **6,800 Goods** 11, 13, 15  
* **Field Outposts (Attrition Avoidance, Defense Boosts & Flat VP)**:  
* **Basic Field Outpost** (20% Attrition Avoidance, \+5% Advances, \+25 flat VP/hr): **5,800 Goods** 15, 16  
* **Regular Field Outpost** (40% Attrition Avoidance, \+10% Advances, \+50 flat VP/hr): **10,400 Goods** 13, 16, 17  
* **Advanced Field Outpost** (60% Attrition Avoidance, \+30% Advances, \+100 flat VP/hr): **14,000 Goods** 13, 17  
* **Tactical / Sector Utilities**:  
* **Watchtower** (8% Attrition Avoidance): **500 Goods** 11, 18  
* **Decoys** (15% chance to double enemy attrition): **500 Goods** 11, 18  
* **Traps** (45% chance to double enemy attrition): **3,000 Goods** 11, 12  
* **Starting Province / Headquarters (HQ) Structures**:  
* **Advanced Field Garrison** (80% Attrition Avoidance, \+100% Guild VP): **75,000 Goods** 11, 19, 20  
* **Advanced Guild Fortress** (80% Attrition Avoidance, \+100% Guild VP, \+500 flat VP/hr effectively 1,000 VP/hr): **100,000 Goods** 9, 19, 21

#### League Construction Cost Discounts

Building costs scale based on your guild's active league 22, 23:

* **Copper League**: **90% Discount** (10% of base cost) 23  
* **Silver League**: **80% Discount** (20% of base cost) 23  
* **Gold League**: **70% Discount** (30% of base cost) 23  
* **Platinum League**: **50% Discount** (50% of base cost) 23  
* **Diamond League**: **0% Discount** (100% full base cost) 22, 23

**Guild Battlegrounds (GBG) Trials** allow individual players to customize their personal daily difficulty and reward scaling in GBG 1, 2\. While Attrition continues to serve as your personal difficulty escalator within a day, your chosen **Trial Level (1 to 50\)** sets the baseline intensity and payout multiplier for all encounters you face 1, 3\.

### 8\. Selection & Daily Reset Mechanics

* **Initial Choice**: When you enter GBG for the first time in a season, you are prompted to select a Trial Level 2\.  
* **Daily Adjustments**: You can change your Trial Level at any time 2\. The new selection takes effect at the **next daily reset** (midnight server time), exactly when personal Attrition resets 2\.  
* **Individual Control**: Trial selection is purely personal—it does not affect your guildmates' encounters or your guild's map progress requirements 1, 3\.

### 9\. Difficulty Modifiers & Formulas

Choosing a higher Trial Level applies four specific modifiers to your encounters 3:

1. **Enemy Army Boost Modifier**: A flat boost added to opposing armies (scaling from **\+0%** at Trial 1 up to **\+4,475%** at Trial 50\) 4\.  
2. **Enemy Army Boost Multiplier**: Multiplies your base Attrition enemy boost (scaling from **1.0×** at Trials 1–2 up to **4.0×** at Trial 50\) 4\.  
3. **Enemy Critical Chance**: Gives enemy units a chance to deal 150% critical damage (ranging from **0.00%** at Trials 1–10 up to **50.00%** at Trial 50\) 4\.  
4. **Negotiations Multiplier**: Scales the required goods per negotiation attempt (from **1.0×** at Trials 1–2 up to **4.0×** at Trial 50\) 4\.

#### Encounter Calculation Formulas

* **Total Combat Enemy Boost**: \\\\((\\text{Base Attrition Enemy Boost} \\times \\text{Enemy Boost Multiplier}) \+ \\text{Enemy Boost Modifier}\\\\) 5\.  
* **Total Negotiation Cost**: \\\\(\\text{Base Attrition Negotiation Cost} \\times \\text{Negotiations Multiplier}\\\\) 6\.

### 10\. Trial Reward Structure

Instead of the old random encounter drops, completing battles or negotiations under the Trial system grants two primary rewards 7-9:

* **Battleground Coins**:  
* **Three Coin Tiers**: Earn **Silver** (common), **Gold** (valuable), and **Platinum** (rare) coins per encounter 10\.  
* **Quality Scaling**: Higher Trial Levels increase the overall coin payout and yield a significantly higher proportion of Gold and Platinum coins 10\.  
* **Permanent Inventory**: Coins do not reset between seasons or championships, but are subject to storage limits (**200,000 Silver**, **200,000 Gold**, and **300,000 Platinum**) 11\.  
* **Battleground Stores**: Spend coins in the Common and Uncommon Battleground Stores for active building kits, units, diamonds, and selection kits 12-15.  
* **Rank Points Multiplier**:  
* Selecting higher Trial Levels multiplies the personal Rank Points earned per encounter 12\.  
* The multiplier ranges from **2.0×** at Trial 1 (double standard rank points) up to **7.0×** at Trial 50 4, 12\.

To achieve the maximum **80% Attrition Reduction** cap in Guild Battlegrounds 1, you need to combine province buildings that grant attrition-avoidance chances 2\.  
Province buildings come in three primary tiers of attrition reduction:

* **Advanced (Large)**: **60%** attrition avoidance 3, 4  
* **Regular (Medium)**: **40%** attrition avoidance 3, 4  
* **Basic (Small)**: **20%** attrition avoidance 3, 5*(Note: Watchtowers provide **8%** 6).*

Below is the breakdown of the most optimal, cost-effective building setups for **1-, 2-, and 3-slot sectors**:

### 11\. 1-Slot Sectors

* **Single Sector Cap**: On standard map sectors, no individual 1-slot building reaches the 80% cap on its own—the maximum a single regular province building can provide is **60%** (via an Advanced Field Camp, Advanced Barracks, or Advanced Outpost) 3, 4, 7, 8\.  
* **How to reach 80%**: You must rely on **adjacent sector support** 2\. To hit 80% when attacking from a 1-slot sector, the target sector or an adjacent sector under your control must provide the remaining **20% to 40%** overlap 2\.  
* *HQ Exception*: The un-capturable Headquarters (HQ) starting province is the only single-slot sector where an **Advanced Field Garrison** or **Advanced Guild Fortress** can be built to give a full **80% attrition reduction** 9-11.

### 12\. 2-Slot Sectors

To hit the **80% cap** using only the 2 available slots on a sector, choose between two primary combinations:

* **Combo A: 1× Advanced (60%) \+ 1× Basic (20%) \= 80%** *(Most Cost-Effective)* 2  
* **Field Camps Setup**: 1× Advanced Field Camp (60%) \+ 1× Basic Field Camp (20%) 4, 5  
* *Base Treasury Cost*: **9,900 Goods** (7,000 \+ 2,900) 3-5  
* **Guild Barracks Setup**: 1× Advanced Barracks (60%) \+ 1× Basic Barracks (20%) 4, 7  
* *Base Treasury Cost*: **9,600 Goods** (6,800 \+ 2,800) 3, 4, 7, 12  
* *Why it's best*: Requires the fewest total Treasury goods while hitting the exact 80% cap 2, 3\.  
* **Combo B: 2× Regular (40%) \= 80%**  
* **Field Camps Setup**: 2× Regular Field Camps (40% each) 4  
* *Base Treasury Cost*: **10,400 Goods** (5,200 × 2\) 3, 4  
* **Guild Barracks Setup**: 2× Regular Guild Barracks (40% each) 7  
* *Base Treasury Cost*: **10,000 Goods** (5,000 × 2\) 3, 7  
* *When to use*: Useful when your Treasury is low on the specific era goods requested for Advanced (60%) buildings, letting you split costs across two medium-tier builds 2\.

### 13\. 3-Slot Sectors

When you have 3 slots available, you do not need to fill all 3 slots with attrition-reduction buildings to reach the 80% cap 2\.

* **Optimal Budget Strategy (2 Slots Used, 1 Slot Saved)**:  
* Build **1× Advanced (60%) \+ 1× Basic (20%)** 2\.  
* **Leave the 3rd slot empty** to save thousands of Guild Treasury goods 2\.  
* *Total Cost*: **9,900 Goods** (Camps) or **9,600 Goods** (Barracks) 3, 12\.  
* **3-Slot Cost Spread Strategy (40% \+ 20% \+ 20% \= 80%)**:  
* Build **1× Regular (40%) \+ 2× Basic (20%)** 4, 5\.  
* *Base Treasury Cost*: **11,000 Goods** (Camps) or **10,600 Goods** (Barracks) 3-5, 7\.  
* *When to use*: Ideal if a single 60% building demands goods from an era your guild is critically low on 2\. Spreading the 80% across 3 smaller buildings gives you three separate random rolls for required goods eras 2, 13\.  
* **Victory Point Maximization Strategy**:  
* If your guild has abundant goods and wants to maximize hourly Victory Points (VP), fill the 80% cap with **1× Advanced Field Camp (60%) \+ 1× Basic Field Camp (20%)**, and use the 3rd slot for an **Advanced Field Outpost** (adds \+100 flat VP/hr) or a second **Advanced Field Camp** (+100% VP multiplier) 4, 8, 14\.

### 14\. League Cost Discounts

The base goods costs listed above apply to the **Diamond League** 3, 15\. Guilds competing in lower leagues receive significant construction discounts 15:

* **Copper League**: **90% Discount** (10% of base cost) 15  
* **Silver League**: **80% Discount** (20% of base cost) 15  
* **Gold League**: **70% Discount** (30% of base cost) 15  
* **Platinum League**: **50% Discount** (50% of base cost) 15

