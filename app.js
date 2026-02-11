// --- TITAN BUDGET MANAGER LOGIC ---
// Running in "No-Build" mode for easy PWA deployment

// 1. Destructure React Hooks
const { useState, useEffect } = React;

// 2. Lucide Icons Helper (Since we are using vanilla lucide via CDN)
const createIcon = (name) => {
    if (!window.lucide || !window.lucide.icons || !window.lucide.icons[name]) {
        console.warn(`Icon ${name} not found in lucide global`);
        return (props) => React.createElement('span', props, name); // Fallback
    }

    // Check if the icon data is the children array (vanilla/CDN format) or full definition
    const iconData = window.lucide.icons[name];

    // Default SVG attributes for Lucide
    const defaultAttrs = {
        xmlns: "http://www.w3.org/2000/svg",
        width: 24,
        height: 24,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round"
    };

    return ({ color = "currentColor", size = 24, strokeWidth = 2, className, ...props }) => {
        return React.createElement(
            'svg',
            {
                ...defaultAttrs,
                width: size,
                height: size,
                stroke: color,
                strokeWidth: strokeWidth,
                className: `lucide lucide-${name.toLowerCase()} ${className || ''}`,
                ...props
            },
            Array.isArray(iconData) && iconData.map(([childTag, childAttrs], index) =>
                React.createElement(childTag, { ...childAttrs, key: index })
            )
        );
    };
};

const Users = createIcon('Users');
const DollarSign = createIcon('DollarSign');
const Calendar = createIcon('Calendar');
const Settings = createIcon('Settings');
const Save = createIcon('Save');
const Upload = createIcon('Upload');
const Trash2 = createIcon('Trash2');
const Plus = createIcon('Plus');
const Download = createIcon('Download');
const AlertCircle = createIcon('AlertCircle');
const Shirt = createIcon('Shirt');
const Calculator = createIcon('Calculator');
const Handshake = createIcon('Handshake');
const PieChart = createIcon('PieChart');
const ClipboardList = createIcon('ClipboardList');
const TrendingUp = createIcon('TrendingUp');
const TrendingDown = createIcon('TrendingDown');
const ArrowRight = createIcon('ArrowRight');

// 3. Default Config
const DEFAULT_FEES = {
    fullUniform: 850,
    partialUniform: 750,
    coachFull: 275,
    coachPartial: 65,
    thirdJersey: 65,
    cageJacket: 90,
    gamesAfter13: 150
};

const INITIAL_STATE = {
    // Team Settings
    ageGroup: "18U",
    isTier2: false,
    headCoach: "",
    manager: "",
    season: "2026",
    extraGames: 0,

    // Data
    roster: [],
    tournaments: [],
    expenses: [],
    teamSponsorships: [],
    transactions: [],
    feeStructure: { ...DEFAULT_FEES }
};

const CATEGORIES = {
    income: ["Player Fees", "Sponsorship", "Fundraising", "Other Income"],
    expense: ["Tournament Fee", "Uniforms/Apparel", "Equipment", "Hotel/Travel", "Umpire Fees", "Admin/Bank Fees", "Titan Fees", "Other Expense"]
};



const FEE_LABELS = {
    fullUniform: "Player Full Uniform",
    partialUniform: "Player Partial Uniform",
    coachFull: "Coach Full Package",
    coachPartial: "Coach Partial Package",
    thirdJersey: "3rd Jersey Cost",
    cageJacket: "Cage Jacket Cost",
    gamesAfter13: "Games After 13 Cost"
};

// 4. Main Component (Global Function)
function App() {
    const [activeTab, setActiveTab] = useState('overview');
    const [data, setData] = useState(INITIAL_STATE);
    const [notification, setNotification] = useState(null);

    // Transaction Form State
    const [newTx, setNewTx] = useState({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        type: 'out',
        category: 'Tournament Fee',
        playerId: '' // Linked Player
    });
    const [selectedTx, setSelectedTx] = useState([]);

    // Style Constants
    const inCls = "w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-400 outline-none placeholder-slate-500";
    const smInCls = "bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:ring-2 focus:ring-amber-400 outline-none";

    const [financials, setFinancials] = useState({
        perPlayerShare: 0,
        sharedExpenses: 0,
        totalCollections: 0,
        playerDetails: {},
        totalTeamSponsorship: 0,
        totalPlayerOverflow: 0,
        actualIncome: 0,
        actualExpense: 0,
        bankBalance: 0,
        titansFees: 0,
        playerTitansFees: 0,
        coachTitansFees: 0,
        extraGamesCost: 0
    });

    // Load Data
    useEffect(() => {
        const savedData = localStorage.getItem('titanBudget_v5');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                // Merge with INITIAL_STATE to ensure all fields exist
                setData(prev => ({
                    ...INITIAL_STATE,
                    ...parsed,
                    // Ensure arrays are actually arrays
                    roster: Array.isArray(parsed.roster) ? parsed.roster : [],
                    tournaments: Array.isArray(parsed.tournaments) ? parsed.tournaments : [],
                    expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
                    teamSponsorships: Array.isArray(parsed.teamSponsorships) ? parsed.teamSponsorships : [],
                    transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
                    feeStructure: { ...DEFAULT_FEES, ...(parsed.feeStructure || {}) }
                }));
            } catch (e) {
                console.error("Failed to load local data", e);
            }
        }
    }, []);

    // Save & Calc
    useEffect(() => {
        localStorage.setItem('titanBudget_v5', JSON.stringify(data));
        recalculateFinancials();
    }, [data]);

    const showNotification = (msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };

    const recalculateFinancials = () => {
        const playerCount = (data.roster || []).filter(p => p.type === 'player').length;

        // Budgeted Expenses
        const tournamentTotal = (data.tournaments || []).reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0);
        const otherExpensesTotal = (data.expenses || []).reduce((sum, e) => sum + (parseFloat(e.cost) || 0), 0);

        const coachExpenses = (data.roster || []).reduce((total, person) => {
            if (person.type !== 'coach') return total;
            let cost = 0;
            if (person.packageType === 'full') cost += data.feeStructure.coachFull;
            if (person.packageType === 'partial') cost += data.feeStructure.coachPartial;
            if (person.extras?.includes('thirdJersey')) cost += data.feeStructure.thirdJersey;
            if (person.extras?.includes('cageJacket')) cost += data.feeStructure.cageJacket;
            return total + cost;
        }, 0);

        // Titans Fees (Player Gear)
        const playerTitansFees = (data.roster || []).reduce((total, person) => {
            if (person.type !== 'player') return total;
            let cost = 0;
            if (person.packageType === 'full') cost += data.feeStructure.fullUniform;
            if (person.packageType === 'partial') cost += data.feeStructure.partialUniform;
            if (person.extras?.includes('thirdJersey')) cost += data.feeStructure.thirdJersey;
            if (person.extras?.includes('cageJacket')) cost += data.feeStructure.cageJacket;
            return total + cost;
        }, 0);

        // Extra Games
        const extraGamesCost = (data.extraGames || 0) * (data.feeStructure.gamesAfter13 || 0);

        // Shared Expenses (Tournaments, Coach costs, etc. - divided by players)
        const sharedExpensesForCalc = tournamentTotal + otherExpensesTotal + coachExpenses + extraGamesCost;

        // Total Budgeted Expenses (Includes everything)
        const totalBudgetedExpenses = sharedExpensesForCalc + playerTitansFees;

        // Total Consolidated Titans Fees (For Display)
        const totalTitansFees = playerTitansFees + coachExpenses + extraGamesCost;

        const directTeamSponsorship = data.teamSponsorships.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

        // Iterative Solver
        let currentOverflow = 0;
        let finalPerPlayerShare = 0;
        let playerResults = {};

        for (let pass = 0; pass < 3; pass++) {
            const netSharedExpenses = sharedExpensesForCalc - directTeamSponsorship - currentOverflow;
            finalPerPlayerShare = playerCount > 0 ? Math.max(0, netSharedExpenses / playerCount) : 0;
            currentOverflow = 0;
            playerResults = {};

            data.roster.forEach(person => {
                let base = 0;
                let extras = 0;
                let share = 0;
                const sponsorship = parseFloat(person.sponsorship) || 0;
                const credit = parseFloat(person.credit) || 0;

                if (person.type === 'player') {
                    if (person.packageType === 'full') base = data.feeStructure.fullUniform;
                    if (person.packageType === 'partial') base = data.feeStructure.partialUniform;
                    share = finalPerPlayerShare;
                } else {
                    if (person.packageType === 'full') base = data.feeStructure.coachFull;
                    if (person.packageType === 'partial') base = data.feeStructure.coachPartial;
                    share = 0;
                }

                if (person.extras?.includes('thirdJersey')) extras += data.feeStructure.thirdJersey;
                if (person.extras?.includes('cageJacket')) extras += data.feeStructure.cageJacket;

                const grossLiability = (person.type === 'player') ? (base + extras + share) : 0;

                let finalOwed = 0;
                let overflow = 0;

                if (person.type === 'player') {
                    const totalReductions = sponsorship + credit;
                    if (totalReductions >= grossLiability) {
                        finalOwed = 0;
                        overflow = totalReductions - grossLiability;
                    } else {
                        finalOwed = grossLiability - totalReductions;
                        overflow = 0;
                    }
                }

                // Calculate Paid (from linked transactions)
                const paid = data.transactions
                    .filter(t => t.type === 'in' && t.playerId == person.id) // Loose equality for string/number mismatch
                    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

                const outstanding = Math.max(0, finalOwed - paid);

                playerResults[person.id] = { base, extras, share, sponsorship, credit, overflow, finalOwed, grossLiability, paid, outstanding };
                currentOverflow += overflow;
            });
        }

        const totalCollections = Object.values(playerResults).reduce((sum, p) => sum + p.finalOwed, 0);
        const totalPlayerSponsorship = data.roster.reduce((sum, p) => sum + (parseFloat(p.sponsorship) || 0), 0);
        const totalPlayerCredits = data.roster.reduce((sum, p) => sum + (parseFloat(p.credit) || 0), 0);

        // Ledger Actuals
        const transactionIncome = data.transactions.filter(t => t.type === 'in').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        const actualExpense = data.transactions.filter(t => t.type === 'out').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        // Effective Income includes Transactions + Sponsorships + Credits (Money in hand/Asset)
        const totalEffectiveIncome = transactionIncome + directTeamSponsorship + totalPlayerSponsorship + totalPlayerCredits;

        setFinancials({
            perPlayerShare: finalPerPlayerShare,
            sharedExpenses: totalBudgetedExpenses, // Display total expenses in UI
            totalCollections,
            playerDetails: playerResults,
            totalTeamSponsorship: directTeamSponsorship,
            totalPlayerSponsorship,
            totalPlayerCredits,
            totalPlayerOverflow: currentOverflow,
            transactionIncome, // Renamed for clarity, was actualIncome
            actualIncome: totalEffectiveIncome, // Now acts as Total Assets
            actualExpense,
            bankBalance: totalEffectiveIncome - actualExpense,
            titansFees: totalTitansFees,     // Consolidated Total
            playerTitansFees,                // Breakdown: Player Gear
            coachTitansFees: coachExpenses,  // Breakdown: Coach Gear
            extraGamesCost                   // Breakdown: Extra Games
        });
    };

    // Handlers
    const updateFee = (k, v) => setData(p => ({ ...p, feeStructure: { ...p.feeStructure, [k]: parseFloat(v) || 0 } }));
    const addPerson = (type) => setData(p => ({ ...p, roster: [...p.roster, { id: Date.now(), type, firstName: '', lastName: '', jersey: '', packageType: type === 'player' ? 'full' : 'none', extras: [], sponsorship: 0, credit: 0 }] }));
    const updatePerson = (id, f, v) => setData(p => ({ ...p, roster: p.roster.map(i => i.id === id ? { ...i, [f]: v } : i) }));
    const removePerson = (id) => window.confirm("Remove?") && setData(p => ({ ...p, roster: p.roster.filter(i => i.id !== id) }));
    const toggleExtra = (id, key) => setData(p => ({ ...p, roster: p.roster.map(i => i.id === id ? { ...i, extras: i.extras?.includes(key) ? i.extras.filter(x => x !== key) : [...(i.extras || []), key] } : i) }));

    const addTx = () => {
        if (!newTx.description || !newTx.amount) return;
        // If linked to player, append Name to Description for clarity in simple lists
        let finalDesc = newTx.description;
        // ensure playerId is stored as number if it exists
        const pId = newTx.playerId ? parseFloat(newTx.playerId) : '';

        if (pId) {
            const p = data.roster.find(r => r.id == pId);
            if (p) finalDesc = `${p.firstName} ${p.lastName} - ${finalDesc}`;
        }

        setData(p => ({ ...p, transactions: [{ ...newTx, description: finalDesc, id: Date.now(), amount: parseFloat(newTx.amount), playerId: pId }, ...p.transactions] }));
        setNewTx({ ...newTx, description: '', amount: '', playerId: '' }); // Reset
        showNotification("Transaction Added");
    };
    const removeTx = (id) => window.confirm("Delete Tx?") && setData(p => ({ ...p, transactions: p.transactions.filter(t => t.id !== id) }));

    // Bulk Actions
    const toggleTxSelection = (id) => {
        setSelectedTx(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };
    const deleteSelectedTx = () => {
        if (window.confirm(`Delete ${selectedTx.length} transactions?`)) {
            setData(p => ({ ...p, transactions: p.transactions.filter(t => !selectedTx.includes(t.id)) }));
            setSelectedTx([]);
            showNotification("Transactions Deleted");
        }
    };

    const addTourney = () => setData(p => ({ ...p, tournaments: [...p.tournaments, { id: Date.now(), name: '', cost: 0 }] }));
    const updateTourney = (id, f, v) => setData(p => ({ ...p, tournaments: p.tournaments.map(t => t.id === id ? { ...t, [f]: v } : t) }));
    const removeTourney = (id) => setData(p => ({ ...p, tournaments: p.tournaments.filter(t => t.id !== id) }));

    const addExp = () => setData(p => ({ ...p, expenses: [...p.expenses, { id: Date.now(), name: '', cost: 0 }] }));
    const updateExp = (id, f, v) => setData(p => ({ ...p, expenses: p.expenses.map(e => e.id === id ? { ...e, [f]: v } : e) }));
    const removeExp = (id) => setData(p => ({ ...p, expenses: p.expenses.filter(e => e.id !== id) }));

    const addSpon = () => setData(p => ({ ...p, teamSponsorships: [...p.teamSponsorships, { id: Date.now(), name: '', amount: 0 }] }));
    const updateSpon = (id, f, v) => setData(p => ({ ...p, teamSponsorships: p.teamSponsorships.map(s => s.id === id ? { ...s, [f]: v } : s) }));
    const removeSpon = (id) => setData(p => ({ ...p, teamSponsorships: p.teamSponsorships.filter(s => s.id !== id) }));

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TitansBackup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const parsed = JSON.parse(evt.target.result);
                if (!parsed.transactions) parsed.transactions = [];
                if (!parsed.teamSponsorships) parsed.teamSponsorships = [];
                setData(parsed);
                showNotification("Backup Loaded");
            } catch (e) { alert("Invalid File"); }
        };
        reader.readAsText(file);
    };

    // PDF Generation
    const generatePDF = () => {
        if (!window.jspdf) {
            alert("PDF Library not loaded. Please refresh.");
            return;
        }

        const doc = new window.jspdf.jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Helper
        const centerText = (text, y, size = 12, style = 'normal') => {
            doc.setFontSize(size);
            doc.setFont("helvetica", style);
            const textWidth = doc.getStringUnitWidth(text) * size / doc.internal.scaleFactor;
            doc.text(text, (pageWidth - textWidth) / 2, y);
        };

        const drawLine = (y) => {
            doc.setDrawColor(200, 200, 200);
            doc.line(14, y, pageWidth - 14, y);
        };

        // Header
        doc.setFillColor(34, 139, 34); // Forest Green
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);

        centerText((data.ageGroup || data.headCoach) ? `${data.ageGroup} ${data.isTier2 ? 'T2' : ''} - ${data.headCoach}` : 'Titan Budget', 20, 22, 'bold');
        centerText(`${data.season} Budget Report`, 30, 14);

        doc.setTextColor(0, 0, 0);

        let finalY = 50;

        // 1. Titans Fees (Organization)
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Titans Fees (Organization)", 14, finalY);
        finalY += 8;

        const feeRows = [];
        if (financials.playerTitansFees > 0) feeRows.push(["Player Gear", fmt(financials.playerTitansFees)]);
        if (financials.coachTitansFees > 0) feeRows.push(["Coach Gear", fmt(financials.coachTitansFees)]);
        if (financials.extraGamesCost > 0) feeRows.push([`Extra Games (${data.extraGames})`, fmt(financials.extraGamesCost)]);
        feeRows.push(["TOTAL OWED TO ORGANIZATION", fmt(financials.titansFees)]);

        doc.autoTable({
            startY: finalY,
            head: [['Item', 'Amount']],
            body: feeRows,
            theme: 'striped',
            headStyles: { fillColor: [0, 0, 0], textColor: [255, 215, 0] }, // Black & Gold
            columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
            didParseCell: (data) => {
                if (data.row.index === feeRows.length - 1 && data.section === 'body') {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [217, 119, 6];
                }
            }
        });

        finalY = doc.lastAutoTable.finalY + 15;

        // 2. Team Expenses (Budget)
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Team Expenses Breakdown", 14, finalY);
        finalY += 8;

        const expenseRows = [
            ...data.tournaments.map(t => [t.name || 'Tournament', fmt(t.cost)]),
            ...data.expenses.map(e => [e.name || 'Expense', fmt(e.cost)]),
            ["Titans Fees (From Above)", fmt(financials.titansFees)],
            ["TOTAL TEAM BUDGET", fmt(financials.sharedExpenses)]
        ];

        doc.autoTable({
            startY: finalY,
            head: [['Item', 'Cost']],
            body: expenseRows,
            theme: 'striped',
            headStyles: { fillColor: [0, 0, 0], textColor: [255, 215, 0] }, // Black & Gold
            columnStyles: { 1: { halign: 'right' } },
            didParseCell: (data) => {
                if (data.row.index === expenseRows.length - 1 && data.section === 'body') {
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });

        finalY = doc.lastAutoTable.finalY + 15;

        // 3. Player Fees & Owed
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Player Fees & Amounts Owed", 14, finalY);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Per Player Share (Tournaments/Expenses): ${fmt(financials.perPlayerShare)}`, 14, finalY + 6);
        finalY += 12;

        const playerRows = data.roster.filter(p => p.type === 'player').map(p => {
            const f = financials.playerDetails[p.id] || { finalOwed: 0, share: 0, base: 0, extras: 0, sponsorship: 0, credit: 0 };
            return [
                `${p.firstName} ${p.lastName}`,
                `#${p.jersey}`,
                p.packageType === 'full' ? 'Full ($850)' : 'Part ($750)',
                fmt(f.extras),
                fmt(f.sponsorship),
                fmt(f.credit),
                fmt(f.finalOwed)
            ];
        });

        doc.autoTable({
            startY: finalY,
            head: [['Player', '#', 'Package', 'Extras', 'Sponsor', 'Credit', 'Total Owed']],
            body: playerRows,
            theme: 'grid',
            headStyles: { fillColor: [0, 0, 0], textColor: [255, 215, 0] }, // Black & Gold
            columnStyles: {
                3: { halign: 'right' },
                4: { halign: 'right' },
                5: { halign: 'right' },
                6: { halign: 'right', fontStyle: 'bold', textColor: [217, 119, 6] }
            }
        });

        doc.save(`TitansBudget_${data.season}_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    // Ledger PDF
    const generateLedgerPDF = () => {
        if (!window.jspdf) {
            alert("PDF Library not loaded. Please refresh.");
            return;
        }

        const doc = new window.jspdf.jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Helper
        const centerText = (text, y, size = 12, style = 'normal') => {
            doc.setFontSize(size);
            doc.setFont("helvetica", style);
            const textWidth = doc.getStringUnitWidth(text) * size / doc.internal.scaleFactor;
            doc.text(text, (pageWidth - textWidth) / 2, y);
        };

        // Header
        doc.setFillColor(34, 139, 34); // Forest Green
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);

        centerText((data.ageGroup || data.headCoach) ? `${data.ageGroup} ${data.isTier2 ? 'T2' : ''} - ${data.headCoach}` : 'Titan Budget', 20, 22, 'bold');
        centerText(`${data.season} Financial Ledger`, 30, 14);

        doc.setTextColor(0, 0, 0);

        let finalY = 50;

        // 1. Financial Summary
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Financial Summary", 14, finalY);
        finalY += 8;

        const summaryRows = [
            ["Transactions (Income)", fmt(financials.transactionIncome)],
            ["Team Sponsorships", fmt(financials.totalTeamSponsorship)],
            ["Player Sponsorships", fmt(financials.totalPlayerSponsorship)],
            ["Player Credits", fmt(financials.totalPlayerCredits)],
            ["TOTAL INCOME / ASSETS", fmt(financials.actualIncome)],
            ["Total Actual Expenses", fmt(financials.actualExpense)],
            ["NET BANK BALANCE", fmt(financials.bankBalance)]
        ];

        doc.autoTable({
            startY: finalY,
            head: [['Item', 'Amount']],
            body: summaryRows,
            theme: 'striped',
            headStyles: { fillColor: [0, 0, 0], textColor: [255, 215, 0] }, // Black & Gold
            columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
            didParseCell: (data) => {
                if (data.row.index === summaryRows.length - 1 && data.section === 'body') {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = financials.bankBalance >= 0 ? [16, 185, 129] : [239, 68, 68]; // Emerald vs Red
                }
            }
        });

        finalY = doc.lastAutoTable.finalY + 15;

        // 2. Refund Calculation
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("End of Season Refund Calculation", 14, finalY);
        finalY += 8;

        // Count ONLY players, not coaches
        const playerCount = data.roster.filter(p => p.type === 'player').length;
        const refundPerPlayer = playerCount > 0 ? financials.bankBalance / playerCount : 0;

        const refundRows = [
            ["Net Bank Balance", fmt(financials.bankBalance)],
            ["Number of Players", playerCount],
            ["PROPOSED REFUND PER PLAYER", fmt(refundPerPlayer)],
            ["Projected Final Balance", fmt(0)]
        ];

        doc.autoTable({
            startY: finalY,
            head: [['Calculation', 'Value']],
            body: refundRows,
            theme: 'grid',
            headStyles: { fillColor: [0, 0, 0], textColor: [255, 215, 0] }, // Black & Gold
            columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
            didParseCell: (data) => {
                if (data.row.index === 2 && data.section === 'body') {
                    data.cell.styles.textColor = [16, 185, 129]; // Emerald
                    data.cell.styles.fontSize = 11;
                }
            }
        });

        // Page Break for Transactions
        doc.addPage();
        finalY = 20;

        // 3. Transactions Log
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Transaction History", 14, finalY);
        finalY += 8;

        // Sort Newest First
        const sortedTx = [...data.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

        const txRows = sortedTx.map(t => [
            t.date,
            t.description,
            t.category,
            t.type === 'in' ? '+' : '-',
            fmt(t.amount)
        ]);

        doc.autoTable({
            startY: finalY,
            head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
            body: txRows,
            theme: 'striped',
            headStyles: { fillColor: [0, 0, 0], textColor: [255, 215, 0] }, // Black & Gold
            columnStyles: {
                3: { halign: 'center' },
                4: { halign: 'right' }
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 4) {
                    const type = sortedTx[data.row.index].type;
                    data.cell.styles.textColor = type === 'in' ? [16, 185, 129] : [239, 68, 68];
                }
            }
        });

        doc.save(`TitansLedger_${data.season}_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    // Reset Data
    const resetData = () => {
        if (window.confirm("Are you sure you want to delete ALL data? This cannot be undone.")) {
            localStorage.removeItem('titanBudget_v5');
            setData(INITIAL_STATE);
            setNotification("Data Reset");
        }
    };

    const fmt = (v) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(v || 0);

    // Styles
    // Moved to top of component

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-10">
            {/* HEADER */}
            <div className="bg-emerald-900 border-b border-emerald-800 p-4 sticky top-0 z-50 shadow-lg">
                <div className="max-w-6xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
                    <div className="text-center lg:text-left">
                        <h1 className="text-xl font-bold flex items-center justify-center lg:justify-start gap-2 text-white">
                            <span className="bg-amber-400 text-emerald-900 px-2 py-1 rounded text-sm font-black">T</span>
                            {(data.ageGroup || data.headCoach) ? `${data.ageGroup} ${data.isTier2 ? 'T2' : ''} - ${data.headCoach}` : 'Titan Budget'}
                        </h1>
                        <p className="text-emerald-200 text-xs mt-1">{data.season} Season {data.manager ? `| Mgr: ${data.manager}` : ''}</p>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 bg-slate-900 rounded-lg p-1 w-full lg:w-auto border border-slate-800">
                        {[
                            { id: 'overview', icon: PieChart, label: 'Stats' },
                            { id: 'ledger', icon: ClipboardList, label: 'Ledger' },
                            { id: 'roster', icon: Users, label: 'Roster' },
                            { id: 'expenses', icon: DollarSign, label: 'Budget' },
                            { id: 'sponsorships', icon: Handshake, label: 'Sponsors' },
                            { id: 'settings', icon: Settings, label: 'Setup' },
                            { id: 'save', icon: Save, label: 'Data' },
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 sm:px-2 py-2 rounded transition-all text-[10px] sm:text-xs font-medium ${activeTab === tab.id ? 'bg-amber-400 text-slate-900 font-bold' : 'text-slate-400'}`}>
                                <tab.icon size={14} />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-4 space-y-6">
                {notification && <div className="fixed bottom-4 right-4 bg-amber-400 text-slate-900 px-6 py-3 rounded-lg shadow-xl z-50 font-bold border-2 border-amber-300 animate-bounce">{notification}</div>}

                {/* OVERVIEW */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 relative overflow-hidden">
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div>
                                    <h2 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Bank Balance</h2>
                                    <div className={`text-4xl sm:text-5xl font-black ${financials.bankBalance >= 0 ? 'text-white' : 'text-red-500'}`}>{fmt(financials.bankBalance)}</div>
                                </div>
                                <div className="text-right space-y-1">
                                    <div className="text-emerald-400 text-xs font-bold uppercase">In: {fmt(financials.actualIncome)}</div>
                                    <div className="text-red-400 text-xs font-bold uppercase">Out: {fmt(financials.actualExpense)}</div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                                <div className="flex items-center gap-2 mb-2"><TrendingUp className="text-emerald-400" size={16} /><h4 className="font-bold">Income & Assets</h4></div>
                                <div className="space-y-1 mb-2 border-b border-slate-800 pb-2">
                                    <div className="flex justify-between text-xs text-slate-400"><span>Transactions (In)</span><span>{fmt(financials.transactionIncome)}</span></div>
                                    <div className="flex justify-between text-xs text-slate-400"><span>Team Sponsors</span><span>{fmt(financials.totalTeamSponsorship)}</span></div>
                                    <div className="flex justify-between text-xs text-slate-400"><span>Player Sponsors</span><span>{fmt(financials.totalPlayerSponsorship)}</span></div>
                                    <div className="flex justify-between text-xs text-slate-400"><span>Player Credits</span><span>{fmt(financials.totalPlayerCredits)}</span></div>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-300">Total Available</span><span className="text-emerald-400 font-bold">{fmt(financials.actualIncome)}</span>
                                </div>
                            </div>
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                                <div className="flex items-center gap-2 mb-2"><TrendingDown className="text-red-400" size={16} /><h4 className="font-bold">Expenses</h4></div>
                                <div className="flex justify-between text-sm border-b border-slate-800 pb-2 mb-2">
                                    <span className="text-slate-400">Budgeted</span><span className="text-slate-300">{fmt(financials.sharedExpenses)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Actual</span><span className="text-red-400 font-bold">{fmt(financials.actualExpense)}</span>
                                </div>
                            </div>
                        </div>

                        {/* SCOREBOARD */}
                        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                            <h3 className="text-sm font-bold text-slate-300 uppercase mb-3">Player Fee Scoreboard</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {data.roster.filter(p => p.type === 'player').map(p => {
                                    const f = financials.playerDetails[p.id] || { paid: 0, outstanding: 0, finalOwed: 0 };
                                    const isPaidOff = f.outstanding <= 0.01;
                                    return (
                                        <div key={p.id} className={`p-2 rounded border ${isPaidOff ? 'bg-emerald-900/30 border-emerald-800' : 'bg-slate-950 border-slate-800'}`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold text-xs truncate">{p.firstName} {p.lastName.charAt(0)}.</span>
                                                <span className={`text-[10px] px-1 rounded ${isPaidOff ? 'bg-emerald-500 text-slate-900' : 'bg-red-500 text-white'}`}>{isPaidOff ? 'PAID' : 'DUE'}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Paid:</span>
                                                <span className="text-emerald-400">{fmt(f.paid)}</span>
                                            </div>
                                            {f.credit > 0 && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500">Credit:</span>
                                                    <span className="text-blue-400">{fmt(f.credit)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-xs font-bold mt-1 pt-1 border-t border-slate-800/50">
                                                <span className="text-slate-400">Owed:</span>
                                                <span className={isPaidOff ? 'text-slate-400' : 'text-red-400'}>{fmt(f.outstanding)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* LEDGER */}
                {activeTab === 'ledger' && (
                    <div className="space-y-4">
                        {/* NEW TRANSACTION & ACTIONS */}
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-slate-300 uppercase">{editingTxId ? 'Edit Entry' : 'Transactions'}</h3>
                                    {editingTxId && <button onClick={cancelEdit} className="bg-slate-700 text-xs px-2 py-1 rounded text-slate-300">Cancel</button>}
                                    {!editingTxId && selectedTx.length > 0 && (
                                        <button onClick={deleteSelectedTx} className="bg-red-600 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1 animate-pulse">
                                            <Trash2 size={10} /> Delete ({selectedTx.length})
                                        </button>
                                    )}
                                </div>
                                <button onClick={generateLedgerPDF} className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded border border-slate-700 transition-colors">
                                    <Download size={12} /> PDF Report
                                </button>
                            </div>

                            {/* ADD FORM */}
                            <div className={`grid grid-cols-2 lg:grid-cols-6 gap-2 mb-4 p-3 rounded border ${editingTxId ? 'bg-amber-900/20 border-amber-800/50' : 'bg-slate-950 border-slate-800'}`}>
                                <input type="date" className={inCls} value={newTx.date} onChange={e => setNewTx({ ...newTx, date: e.target.value })} />
                                <select className={inCls} value={newTx.type} onChange={e => setNewTx({ ...newTx, type: e.target.value, category: CATEGORIES[e.target.value === 'in' ? 'income' : 'expense'][0] })}>
                                    <option value="in">In (+)</option><option value="out">Out (-)</option>
                                </select>

                                {newTx.type === 'in' ? (
                                    <select className={inCls} value={newTx.playerId || ''} onChange={e => setNewTx({ ...newTx, playerId: e.target.value })}>
                                        <option value="">-- Team Income --</option>
                                        {data.roster.filter(p => p.type === 'player').map(p => (
                                            <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="text-xs text-slate-500 flex items-center justify-center italic">Team Expense</div>
                                )}

                                <select className={inCls} value={newTx.category} onChange={e => setNewTx({ ...newTx, category: e.target.value })}>
                                    {CATEGORIES[newTx.type === 'in' ? 'income' : 'expense'].map(c => <option key={c}>{c}</option>)}
                                </select>
                                <input className={inCls} placeholder="Desc" value={newTx.description} onChange={e => setNewTx({ ...newTx, description: e.target.value })} />
                                <div className="flex gap-2">
                                    <input type="number" className={inCls} placeholder="$" value={newTx.amount} onChange={e => setNewTx({ ...newTx, amount: e.target.value })} />
                                    <button onClick={addTx} className={`${editingTxId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'} text-white px-3 rounded flex items-center justify-center`}>
                                        {editingTxId ? <Save size={18} /> : <Plus size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* LIST */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800"><tr><th className="w-8 p-3 text-center"><input type="checkbox" onChange={(e) => setSelectedTx(e.target.checked ? data.transactions.map(t => t.id) : [])} checked={selectedTx.length === data.transactions.length && data.transactions.length > 0} /></th><th className="p-3">Date</th><th className="p-3">Desc</th><th className="p-3 text-right">Amt</th><th className="w-16"></th></tr></thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {data.transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => (
                                            <tr key={t.id} className={selectedTx.includes(t.id) ? 'bg-slate-800/50' : ''}>
                                                <td className="p-3 text-center"><input type="checkbox" checked={selectedTx.includes(t.id)} onChange={() => toggleTxSelection(t.id)} /></td>
                                                <td className="p-3 text-slate-400 text-xs">{t.date}</td>
                                                <td className="p-3"><div>{t.description}</div><div className="text-xs text-slate-500">{t.category}</div></td>
                                                <td className={`p-3 text-right font-bold ${t.type === 'in' ? 'text-emerald-400' : 'text-red-400'}`}>{t.type === 'in' ? '+' : '-'}{fmt(t.amount)}</td>
                                                <td className="p-3 flex gap-2 justify-end">
                                                    <button onClick={() => editTx(t)} className="text-slate-500 hover:text-amber-400 transition-colors"><Settings size={14} /></button>
                                                    <button onClick={() => removeTx(t.id)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ROSTER */}
                {activeTab === 'roster' && (
                    <div className="space-y-4">
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => addPerson('player')} className="bg-emerald-600 text-white px-3 py-1 text-xs rounded">+ Player</button>
                            <button onClick={() => addPerson('coach')} className="bg-slate-700 text-white px-3 py-1 text-xs rounded">+ Coach</button>
                        </div>
                        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800"><tr><th className="p-3">Name</th><th className="p-3">Pkg</th><th className="p-3 text-right">Share</th><th className="p-3 text-right">Sponsor</th><th className="p-3 text-right">Credit</th><th className="p-3 text-right text-amber-400">Owed</th><th className="w-8"></th></tr></thead>
                                <tbody className="divide-y divide-slate-800">
                                    {data.roster.map(p => {
                                        const f = financials.playerDetails[p.id] || { finalOwed: 0, share: 0 };
                                        return (
                                            <tr key={p.id}>
                                                <td className="p-3">
                                                    <div className="flex gap-1 mb-1 min-w-[160px]">
                                                        <input className={`${smInCls} flex-1 min-w-0`} value={p.firstName} onChange={e => updatePerson(p.id, 'firstName', e.target.value)} placeholder="First" />
                                                        <input className={`${smInCls} flex-1 min-w-0`} value={p.lastName} onChange={e => updatePerson(p.id, 'lastName', e.target.value)} placeholder="Last" />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] px-1 rounded ${p.type === 'player' ? 'bg-blue-900 text-blue-300' : 'bg-purple-900 text-purple-300'}`}>{p.type}</span>
                                                        <input className={`${smInCls} w-12 text-center`} type="text" placeholder="#" value={p.jersey || ''} onChange={e => updatePerson(p.id, 'jersey', e.target.value)} />
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <select className={`${smInCls} w-24 mb-1`} value={p.packageType} onChange={e => updatePerson(p.id, 'packageType', e.target.value)}><option value="full">Full</option><option value="partial">Part</option></select>
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={p.extras?.includes('thirdJersey')} onChange={() => toggleExtra(p.id, 'thirdJersey')} /> 3rd Jersey</label>
                                                        <label className="text-[10px] flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={p.extras?.includes('cageJacket')} onChange={() => toggleExtra(p.id, 'cageJacket')} /> Cage Jacket</label>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-right text-emerald-400">{p.type === 'player' ? fmt(f.share) : '-'}</td>
                                                <td className="p-3 text-right">{p.type === 'player' ? <input type="number" className={`${smInCls} w-16 text-right border-blue-900`} value={p.sponsorship} onChange={e => updatePerson(p.id, 'sponsorship', e.target.value)} placeholder="0" /> : '-'}</td>
                                                <td className="p-3 text-right">{p.type === 'player' ? <input type="number" className={`${smInCls} w-16 text-right border-blue-900`} value={p.credit} onChange={e => updatePerson(p.id, 'credit', e.target.value)} placeholder="0" /> : '-'}</td>
                                                <td className="p-3 text-right font-bold text-amber-400">{fmt(f.finalOwed)}</td>
                                                <td className="p-3"><button onClick={() => removePerson(p.id)} className="text-slate-600 hover:text-red-500"><Trash2 size={14} /></button></td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* EXPENSES / BUDGET */}
                {activeTab === 'expenses' && (
                    <div className="space-y-4">
                        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-slate-300 uppercase text-xs">Titans Fees (Organization)</h3>
                                <button onClick={generatePDF} className="flex items-center gap-1 bg-red-900/50 hover:bg-red-900/80 text-red-200 text-xs px-2 py-1 rounded border border-red-800 transition-colors">
                                    <Download size={12} /> PDF Report
                                </button>
                            </div>

                            <div className="bg-slate-950 rounded border border-slate-800 p-2 mb-2">
                                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <Shirt size={16} className="text-amber-400" />
                                        <span className="text-sm font-bold text-slate-200">Total Titans Fees</span>
                                    </div>
                                    <span className="text-lg font-black text-amber-400">{fmt(financials.titansFees)}</span>
                                </div>
                                <div className="space-y-1 text-xs text-slate-400 px-2">
                                    <div className="flex justify-between"><span>Player Gear:</span><span>{fmt(financials.playerTitansFees)}</span></div>
                                    <div className="flex justify-between"><span>Coach Gear:</span><span>{fmt(financials.coachTitansFees)}</span></div>
                                    <div className="flex justify-between items-center">
                                        <span>Extra Games ({data.extraGames || 0}):</span>
                                        <div className="flex items-center gap-2">
                                            <input type="number" min="0" className={`${smInCls} w-10 text-center py-0`} placeholder="#" value={data.extraGames || 0} onChange={e => setData(p => ({ ...p, extraGames: parseInt(e.target.value) || 0 }))} />
                                            <span>{fmt(financials.extraGamesCost)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                                <div className="flex justify-between mb-2"><h3 className="font-bold">Tournaments</h3><button onClick={addTourney} className="text-xs bg-emerald-900 text-emerald-400 px-2 rounded">+ Add</button></div>
                                {data.tournaments.map(t => (<div key={t.id} className="flex gap-2 mb-2"><input className={smInCls} value={t.name} onChange={e => updateTourney(t.id, 'name', e.target.value)} placeholder="Name" /><input type="number" className={`${smInCls} w-20`} value={t.cost} onChange={e => updateTourney(t.id, 'cost', e.target.value)} placeholder="$" /><button onClick={() => removeTourney(t.id)}><Trash2 size={14} /></button></div>))}
                            </div>
                            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                                <div className="flex justify-between mb-2"><h3 className="font-bold">Expenses</h3><button onClick={addExp} className="text-xs bg-amber-900 text-amber-400 px-2 rounded">+ Add</button></div>
                                {data.expenses.map(e => (<div key={e.id} className="flex gap-2 mb-2"><input className={smInCls} value={e.name} onChange={v => updateExp(e.id, 'name', v.target.value)} placeholder="Item" /><input type="number" className={`${smInCls} w-20`} value={e.cost} onChange={v => updateExp(e.id, 'cost', v.target.value)} placeholder="$" /><button onClick={() => removeExp(e.id)}><Trash2 size={14} /></button></div>))}
                            </div>
                        </div>
                    </div>
                )}

                {/* SPONSORSHIPS */}
                {activeTab === 'sponsorships' && (
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                        <div className="flex justify-between mb-4"><h3 className="font-bold">Team Sponsors</h3><button onClick={addSpon} className="text-xs bg-amber-900 text-amber-400 px-2 rounded">+ Add</button></div>
                        {data.teamSponsorships.map(s => (<div key={s.id} className="flex gap-2 mb-2"><input className={inCls} value={s.name} onChange={e => updateSpon(s.id, 'name', e.target.value)} placeholder="Company" /><input type="number" className={`${inCls} w-32`} value={s.amount} onChange={e => updateSpon(s.id, 'amount', e.target.value)} placeholder="$" /><button onClick={() => removeSpon(s.id)}><Trash2 size={16} /></button></div>))}
                    </div>
                )}

                {/* SETTINGS / SAVE */}
                {['settings', 'save'].includes(activeTab) && (
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4 max-w-lg mx-auto">
                        {activeTab === 'settings' && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-300 uppercase mb-2">Team Details</h3>
                                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded border border-slate-800">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-xs text-slate-400 mb-1">Age Group</label>
                                        <select className={inCls} value={data.ageGroup} onChange={e => setData(p => ({ ...p, ageGroup: e.target.value }))}>
                                            {["8U", "9U", "10U", "11U", "12U", "13U", "14U", "15U", "16U", "18U", "22U"].map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1 flex items-end pb-2">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 select-none">
                                            <input type="checkbox" checked={data.isTier2} onChange={e => setData(p => ({ ...p, isTier2: e.target.checked }))} className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-400 focus:ring-amber-400" />
                                            Tier 2 Team
                                        </label>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-xs text-slate-400 mb-1">Head Coach</label>
                                        <input className={inCls} value={data.headCoach} onChange={e => setData(p => ({ ...p, headCoach: e.target.value }))} placeholder="Coach Name" />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-xs text-slate-400 mb-1">Manager</label>
                                        <input className={inCls} value={data.manager} onChange={e => setData(p => ({ ...p, manager: e.target.value }))} placeholder="Manager Name" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs text-slate-400 mb-1">Season Year</label>
                                        <input className={inCls} value={data.season} onChange={e => setData(p => ({ ...p, season: e.target.value }))} placeholder="e.g. 2026" />
                                    </div>
                                </div>

                                <h3 className="text-sm font-bold text-slate-300 uppercase mb-2 mt-4">Fee Structure</h3>
                                {Object.entries(data.feeStructure).map(([k, v]) => (
                                    <div key={k} className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800 mb-2">
                                        <label className="text-sm font-medium text-slate-300">{FEE_LABELS[k] || k}</label>
                                        <input type="number" className={`${smInCls} w-24 text-right`} value={v} onChange={e => updateFee(k, e.target.value)} />
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeTab === 'save' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={handleExport} className="p-4 border border-emerald-900 rounded text-emerald-500 font-bold hover:bg-emerald-900/20 transition-colors">
                                        Download Backup
                                    </button>
                                    <div className="relative p-4 border border-amber-900 rounded text-amber-500 font-bold text-center hover:bg-amber-900/20 transition-colors cursor-pointer">
                                        Upload Backup
                                        <input type="file" onChange={handleImport} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-800">
                                    <button onClick={resetData} className="w-full p-4 border border-red-900/50 text-red-500 font-bold rounded hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2">
                                        <Trash2 size={16} /> Reset All Data
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div >
    );
}

// Expose App to global scope for Babel Standalone
window.App = App;