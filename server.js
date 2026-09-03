const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const express = require('express');
const app = express();
const path = require('path');

// Servir les fichiers statiques (index.html, CSS, images...)
app.use(express.static(__dirname));

const app = express();
app.use(cors());
app.use(express.json());


const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}


app.use('/uploads', express.static(uploadDir));


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });


const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ouestpro_db'
});

db.connect(err => {
    if (err) {
        console.error("Erreur de connexion MySQL :", err);
        return;
    }
    console.log("Connecté à la base de données MySQL !");
});

// ROUTE 1 : Inscription
app.post('/api/inscription', async (req, res) => {
    const { nom, prenom, tel, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = "INSERT INTO utilisateurs (nom, prenom, tel, email, password) VALUES (?, ?, ?, ?, ?)";
        db.query(query, [nom, prenom, tel, email, hashedPassword], (err, result) => {
            if (err) return res.status(500).json({ error: "Erreur d'inscription ou email existant." });
            res.status(201).json({ message: "Inscription réussie !", userId: result.insertId });
        });
    } catch (e) {
        res.status(500).json({ error: "Erreur serveur lors du chiffrement." });
    }
});


app.post('/api/connexion', (req, res) => {
    const { email, password } = req.body;
    db.query("SELECT * FROM utilisateurs WHERE email = ?", [email], async (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ error: "Utilisateur non trouvé." });
        
        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: "Mot de passe incorrect." });

        res.json({
            user: {
                id: user.id,
                nom: user.nom,
                prenom: user.prenom,
                email: user.email,
                role: user.role || 'client'
            }
        });
    });
});


app.post('/api/commandes', upload.single('fichierIndications'), (req, res) => {
    const { userId, produit, prix, details } = req.body;
    
    if (!userId || !produit) {
        return res.status(400).json({ error: "Données de commande incomplètes." });
    }

    let detailsObj = {};
    try {
        detailsObj = typeof details === 'string' ? JSON.parse(details) : (details || {});
    } catch (e) {
        detailsObj = { indications: details };
    }

    
    if (req.file) {
        detailsObj["Fichier d'indications / Pièce jointe"] = {
            nomFichier: req.file.originalname,
            lienFichier: `http://192.168.1.200:3000/uploads/${req.file.filename}`
        };
    }

    const detailsJson = JSON.stringify(detailsObj);
    const query = "INSERT INTO commandes (user_id, produit, prix, details, statut) VALUES (?, ?, ?, ?, 'En attente')";

    db.query(query, [userId, produit, prix, detailsJson], (err, result) => {
        if (err) {
            console.error("Erreur enregistrement commande :", err);
            return res.status(500).json({ error: "Erreur lors de l'enregistrement." });
        }
        res.status(201).json({ message: "Commande enregistrée !", commandeId: result.insertId });
    });
});


app.get('/api/commandes/:userId/:role', (req, res) => {
    const { userId, role } = req.params;

    let query = `
        SELECT c.*, 
               u.nom AS clientNom, 
               u.prenom AS clientPrenom, 
               CONCAT(u.nom, ' ', u.prenom) AS nom_client,
               u.email AS clientEmail, 
               u.tel AS clientTel 
        FROM commandes c 
        LEFT JOIN utilisateurs u ON c.user_id = u.id
    `;
    let params = [];

    if (role !== 'admin') {
        query += " WHERE c.user_id = ?";
        params.push(userId);
    }

    query += " ORDER BY c.id DESC";

    db.query(query, params, (err, results) => {
        if (err) {
            console.error("Erreur SQL Récupération :", err);
            return res.status(500).json({ error: "Erreur de récupération des commandes." });
        }
        res.json(results);
    });
});


app.post('/api/commandes/admin-action', (req, res) => {
    const { commandeId, statut, nouveauPrix } = req.body;
    const query = "UPDATE commandes SET statut = ?, nouveau_prix = ? WHERE id = ?";
    
    db.query(query, [statut, nouveauPrix || null, commandeId], (err) => {
        if (err) {
            console.error("Erreur SQL Admin Action :", err);
            return res.status(500).json({ error: "Erreur lors de la mise à jour par l'administrateur." });
        }
        res.json({ message: "Statut mis à jour avec succès !" });
    });
});


app.post('/api/commandes/client-action', (req, res) => {
    const { commandeId, reponse } = req.body;

    let query = "";
    let params = [];

    if (reponse === 'Accepter') {
        query = "UPDATE commandes SET prix = nouveau_prix, nouveau_prix = NULL, statut = 'Validée' WHERE id = ?";
        params = [commandeId];
    } else {
        query = "UPDATE commandes SET statut = 'Annulée par le client' WHERE id = ?";
        params = [commandeId];
    }

    db.query(query, params, (err) => {
        if (err) {
            console.error("Erreur SQL Client Action :", err);
            return res.status(500).json({ error: "Erreur lors du traitement de la réponse client." });
        }
        res.json({ message: "Réponse enregistrée !" });
    });
});


const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur prêt et accessible sur http://192.168.1.200:${PORT}`);
});
