const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Service des fichiers statiques (Site + Dossier d'upload)
app.use(express.static(__dirname));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Configuration de Multer (Upload)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Connexion BDD Aiven avec SSL obligatoire
const dbConfig = process.env.DATABASE_URL || {
    host: 'ouestpro-db-simojulie153-3bb9.h.aivencloud.com',
    port: 23083,
    user: process.env.DB_USER || 'avnadmin', // Modifiez si le nom d'utilisateur diffère sur Aiven
    password: process.env.DB_PASSWORD,       // À configurer dans l'onglet Environment sur Render
    database: 'defaultdb',                   // Base par défaut sur Aiven (ou 'ouestpro_db' si créée)
    ssl: { rejectUnauthorized: false }       // Obligatoire pour Aiven cloud
};

const db = mysql.createConnection(dbConfig);

db.connect(err => {
    if (err) {
        console.error("⚠️ Connexion MySQL échouée :", err.message);
    } else {
        console.log("✅ Connecté avec succès à la base de données Aiven Cloud !");
    }
});

// --- ROUTES API ---

// Inscription
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

// Connexion
app.post('/api/connexion', (req, res) => {
    const { email, password } = req.body;
    db.query("SELECT * FROM utilisateurs WHERE email = ?", [email], async (err, results) => {
        if (err || !results || results.length === 0) return res.status(401).json({ error: "Utilisateur non trouvé." });
        
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

// Création de commande
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
        const hostUrl = req.protocol + '://' + req.get('host');
        detailsObj["Fichier d'indications / Pièce jointe"] = {
            nomFichier: req.file.originalname,
            lienFichier: `${hostUrl}/uploads/${req.file.filename}`
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

// Lecture des commandes
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
        res.json(results || []);
    });
});

// Action Admin
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

// Action Client
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

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur actif sur le port ${PORT}`);
});
