const API_URL = "http://192.168.1.200:3000/api";

function getSessionUser() {
    return JSON.parse(localStorage.getItem('currentUser')) || null;
}

function deconnexion() {
    localStorage.removeItem('currentUser');
    window.location.href = "connect.html";
}

async function sInscrire(event) {
    event.preventDefault();
    const elEmail = document.getElementById('in-email');
    const elPassword = document.getElementById('in-password');

    if (!elEmail || !elPassword) {
        alert("Problème de configuration du formulaire HTML.");
        return;
    }

    const payload = {
        nom: document.getElementById('nom')?.value || '',
        prenom: document.getElementById('prenom')?.value || '',
        tel: document.getElementById('tel')?.value || '',
        email: elEmail.value,
        password: elPassword.value
    };

    try {
        const reponse = await fetch(`${API_URL}/inscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await reponse.json();

        if (reponse.ok) {
            alert("Inscription réussie ! Vous pouvez vous connecter.");
            if (typeof basculerOnglet === 'function') basculerOnglet('connexion');
        } else {
            alert("Erreur serveur : " + data.error);
        }
    } catch (erreur) {
        console.error("Erreur réseau :", erreur);
    }
}

async function seConnecter(event) {
    event.preventDefault();
    
    const emailInput = document.getElementById('co-email');
    const passwordInput = document.getElementById('co-password');

    if (!emailInput || !passwordInput) {
        alert("Champs de connexion introuvables dans le DOM.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/connexion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: emailInput.value, 
                password: passwordInput.value 
            })
        });

        const data = await res.json();
        
        if (res.ok) {
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            alert("Connexion réussie !");
            window.location.href = "notifications.html";
        } else {
            alert("Erreur : " + (data.error || "Identifiants incorrects"));
        }
    } catch (e) {
        console.error("Erreur connexion :", e);
        alert("Impossible de contacter le serveur au http://192.168.1.200:3000. Vérifiez votre connexion réseau.");
    }
}

function afficherDetailsComplets(details) {
    if (!details) return "<p><em>Aucun détail fourni.</em></p>";
    
    let data = details;
    if (typeof details === 'string') {
        try { data = JSON.parse(details); } catch (e) { return `<p>${details}</p>`; }
    }

    let html = "<ul style='text-align: left; background: #f9f9f9; padding: 10px 20px; border-radius: 5px; list-style-type: square;'>";
    for (const [cle, valeur] of Object.entries(data)) {
        if (valeur && typeof valeur === 'object' && valeur.lienFichier) {
            html += `<li style='margin-bottom: 5px;'><strong>${cle} :</strong> <a href="${valeur.lienFichier}" target="_blank" style="color:#007bff; font-weight:bold; text-decoration:underline;">📁 Télécharger / Ouvrir (${valeur.nomFichier})</a></li>`;
        } else {
            html += `<li style='margin-bottom: 3px;'><strong>${cle} :</strong> ${valeur}</li>`;
        }
    }
    html += "</ul>";
    return html;
}

function genererCardClient(cmd) {
    let blocProposition = "";
    
    if (cmd.statut === 'Prix modifié' && cmd.nouveau_prix) {
        blocProposition = `
            <div style="background-color: rgb(223,255,223); border: 1px solid rgb(223,255,223); padding: 10px; margin: 10px 0; border-radius: 5px;">
                <p style="color: #856404; margin: 0 0 8px 0;"><strong>L'administrateur vous propose un nouveau prix : ${cmd.nouveau_prix} FCFA</strong></p>
                <button onclick="actionClient(${cmd.id}, 'Accepter')" style="background: green; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-right: 5px;">Accepter le prix</button>
                <button onclick="actionClient(${cmd.id}, 'Annuler')" style="background: red; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Annuler la commande</button>
            </div>
        `;
    }

    return `
        <div class="notification-card" style="border: 1px solid rgb(223,255,223); padding: 15px; margin-bottom: 15px; border-radius: 8px; background:rgb(223,255,223);">
            <h3 style="margin-top:0;">Commande #${cmd.id}</h3>
            <p><strong>Produit :</strong> ${cmd.produit}</p>
            <p><strong>Prix actuel :</strong> ${cmd.prix} FCFA</p>
            <p><strong>Statut :</strong> <span style="font-weight:bold; color:#007bff;">${cmd.statut}</span></p>
            ${blocProposition}
            <div>
                <strong>Détails du formulaire :</strong>
                ${afficherDetailsComplets(cmd.details)}
            </div>
            <small style="color: #666;">Date : ${cmd.created_at ? new Date(cmd.created_at).toLocaleString() : 'N/A'}</small>
        </div>
    `;
}

function genererCardAdmin(cmd) {
    const nomClient = cmd.nom_client || (cmd.clientNom ? `${cmd.clientNom} ${cmd.clientPrenom || ''}` : `Client ID #${cmd.user_id}`);
    
    return `
        <div class="notification-card admin" style="border: 2px solid rgb(223,255,223); padding: 15px; margin-bottom: 15px; border-radius: 8px; background: rgb(223,255,223);">
            <h3 style="margin-top:0; color: #007bff;">Commande #${cmd.id} (Gestion Admin)</h3>
            <p><strong>Client :</strong> ${nomClient} (Email: ${cmd.clientEmail || 'N/A'} | Tel: ${cmd.clientTel || 'N/A'})</p>
            <p><strong>Produit :</strong> ${cmd.produit}</p>
            <p><strong>Prix initial :</strong> ${cmd.prix} FCFA</p>
            <p><strong>Statut actuel :</strong> <strong>${cmd.statut}</strong></p>
            
            <div>
                <strong>Toutes les informations remplies :</strong>
                ${afficherDetailsComplets(cmd.details)}
            </div>

            <div style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed rgb(223,255,223);">
                <strong>Actions de l'administrateur :</strong><br><br>
                <button onclick="actionAdmin(${cmd.id}, 'Validée')" style="background: green; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-right: 5px;">Valider la commande</button>
                <button onclick="actionAdmin(${cmd.id}, 'Refusée')" style="background: red; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Refuser la commande</button>
                
                <div style="display: inline-block; margin-top: 5px;">
                    <input type="number" id="nouveau-prix-${cmd.id}" placeholder="Nouveau prix" style="width: 110px; padding: 5px;">
                    <button onclick="modifierPrixAdmin(${cmd.id})" style="background: orange; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Proposer ce prix</button>
                </div>
            </div>
            
            <small style="color: #666; display:block; margin-top:10px;">Reçue le : ${cmd.created_at ? new Date(cmd.created_at).toLocaleString() : 'N/A'}</small>
        </div>
    `;
}

async function chargerNotifications() {
    const user = getSessionUser();
    if (!user) {
        window.location.href = "connect.html";
        return;
    }
    
    const container = document.getElementById('liste-notifications');
    if (!container) return;

    try {
        const userId = user.id || user.userId || user.ID;
        const role = user.role || 'client';

        const res = await fetch(`${API_URL}/commandes/${userId}/${role}`);
        const mesCommandes = await res.json();

        container.innerHTML = "";

        if (!Array.isArray(mesCommandes) || mesCommandes.length === 0) {
            container.innerHTML = "<p style='text-align:center;'>Aucune commande disponible.</p>";
            return;
        }

        mesCommandes.forEach(cmd => {
            if (role === 'admin') {
                container.innerHTML += genererCardAdmin(cmd);
            } else {
                container.innerHTML += genererCardClient(cmd);
            }
        });
    } catch (e) {
        console.error("Erreur de chargement des notifications :", e);
        container.innerHTML = "<p style='text-align:center; color:red;'>Erreur lors du chargement des commandes.</p>";
    }
}

async function actionAdmin(commandeId, statut, nouveauPrix = null) {
    try {
        const res = await fetch(`${API_URL}/commandes/admin-action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commandeId, statut, nouveauPrix })
        });
        if (res.ok) {
            chargerNotifications();
        } else {
            alert("Erreur lors de la mise à jour par l'administrateur.");
        }
    } catch (e) {
        console.error("Erreur action admin :", e);
    }
}

function modifierPrixAdmin(commandeId) {
    const prixInput = document.getElementById(`nouveau-prix-${commandeId}`).value;
    if (!prixInput) return alert("Veuillez entrer un montant.");
    actionAdmin(commandeId, 'Prix modifié', prixInput);
}

async function actionClient(commandeId, reponse) {
    try {
        const res = await fetch(`${API_URL}/commandes/client-action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commandeId, reponse })
        });
        if (res.ok) {
            chargerNotifications();
        } else {
            alert("Erreur lors du traitement de la réponse.");
        }
    } catch (e) {
        console.error("Erreur action client :", e);
    }
}

document.addEventListener('DOMContentLoaded', chargerNotifications);

async function traiterCommande(event, typeProduit, prixUnitaire) {
    event.preventDefault();
    const currentUser = getSessionUser();

    if (!currentUser) {
        alert("Vous devez être connecté pour passer une commande !");
        window.location.href = "connect.html";
        return;
    }

    const form = event.target;
    const formData = new FormData();
    let detailsFormulaire = {};

    const inputs = form.querySelectorAll('input:not([type="file"]), select, textarea');
    inputs.forEach((input, index) => {
        if (input.type !== 'submit' && input.type !== 'button' && input.value) {
            let label = "";
            const tdParent = input.closest('td');
            if (tdParent && tdParent.previousElementSibling) {
                label = tdParent.previousElementSibling.innerText.replace(':', '').trim();
            }
            if (!label) {
                label = input.name || input.placeholder || `Champ #${index + 1}`;
            }
            detailsFormulaire[label] = input.value;
        }
    });

    const fileInput = form.querySelector('input[type="file"]');
    if (fileInput && fileInput.files.length > 0) {
        formData.append('fichierIndications', fileInput.files[0]);
    }

    const inputQuantite = form.querySelector('input[type="number"]');
    let quantite = inputQuantite && inputQuantite.value ? parseInt(inputQuantite.value) : 1;
    if (isNaN(quantite) || quantite <= 0) quantite = 1;

    formData.append('userId', currentUser.id || currentUser.userId || currentUser.ID);
    formData.append('produit', typeProduit);
    formData.append('prix', quantite * prixUnitaire);
    formData.append('details', JSON.stringify(detailsFormulaire));

    try {
        const res = await fetch(`${API_URL}/commandes`, {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (res.ok) {
            alert("Votre commande et vos fichiers ont bien été envoyés !");
            window.location.href = "notifications.html";
        } else {
            alert("Erreur : " + (data.error || "Échec de l'envoi de la commande."));
        }
    } catch (e) {
        console.error("Erreur lors de l'envoi :", e);
        alert("Impossible de joindre le serveur backend.");
    }
}

function rapel() {
    alert("Vous devez d'abord vous inscrire.");
}

function carteperso() {
    document.write('<FIELDSET style="width: 60%; background: rgb(223,255,223); border: none; border-radius: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); padding: 25px; margin: 25px auto; max-width: 1200px;">');
    document.write('<LEGEND><b><font color="red">Informations pour votre Carte Personnelle</font></b></LEGEND>');
    document.write('<form onsubmit="traiterCommande(event, \'Carte Personnelle\', 100)"><table style="width: 100%; border-collapse: collapse;">');
    document.write('<tr><td style="padding: 8px;"><b>Nom et Prenom :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Titre / Profession :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Photo de profil / Logo :</b></td><td style="padding: 8px;"><input type="file" accept="image/*"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Telephone :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Email :</b></td><td style="padding: 8px;"><input type="email" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>LinkedIn / Portfolio :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>nombre de carte :</b></td><td style="padding: 8px;"><input type="number" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>date et heure livraison :</b></td><td style="padding: 8px;"><input type="time" style="width: 100%;"><input type="date" style="width: 100%;"></td></tr>');
    document.write('<tr><td colspan="2" style="text-align: center; padding-top: 20px;"><input type="submit" value="Valider les informations" style="background:orange; color:white; border:none; padding:10px 20px; border-radius:10px; cursor:pointer; font-weight:bold;"></td></tr>');
    document.write('</table></form></FIELDSET>');

    document.write('<FIELDSET style="width: 60%; background: rgb(223,255,223); border: none; border-radius: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); padding: 25px; margin: 25px auto; max-width: 1200px;">');
    document.write('<LEGEND><b><font color="red">Informations pour votre Carte d\'Entreprise</font></b></LEGEND>');
    document.write('<form onsubmit="traiterCommande(event, \'Carte d\'Entreprise\', 150)"><table style="width: 100%; border-collapse: collapse;">');
    document.write('<tr><td style="padding: 8px;"><b>Nom de l\'entreprise :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Slogan :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Photo de profil / Logo :</b></td><td style="padding: 8px;"><input type="file" name="fichierIndications" accept="image/*"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Nom du representant :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Telephone professionnel :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Email professionnel :</b></td><td style="padding: 8px;"><input type="email" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Site Web :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Localisation :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>nombre de carte :</b></td><td style="padding: 8px;"><input type="number" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>date et heure livraison :</b></td><td style="padding: 8px;"><input type="time" style="width: 100%;"><input type="date" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Services / Produits :</b></td><td style="padding: 8px;"><textarea rows="4" style="width: 100%;"></textarea></td></tr>');
    document.write('<tr><td colspan="2" style="text-align: center; padding-top: 20px;"><input type="submit" value="Valider les informations" style="background:blue; color:white; border:none; padding:10px 20px; border-radius:10px; cursor:pointer; font-weight:bold;"></td></tr>');
    document.write('</table></form></FIELDSET>');
}

function formulairflyer() {
    document.write('<FIELDSET style="width: 60%; background: rgb(223,255,223); border: none; border-radius: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); padding: 25px; margin: 25px auto; max-width: 1200px;">');
    document.write('<LEGEND><b><font color="red">Informations pour la creation du Flyer</font></b></LEGEND>');
    document.write('<form onsubmit="traiterCommande(event, \'Flyer\', 200)"><table style="width: 100%; border-collapse: collapse; border: none;">');
    document.write('<tr><td style="padding: 8px;"><b>Nom de l\'entreprise :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Slogan / Titre principal :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Photo de profil / Logo :</b></td><td style="padding: 8px;"><input type="file" name="fichierIndications" accept="image/*"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Localisation :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Contact (Telephone) :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Email :</b></td><td style="padding: 8px;"><input type="email" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Services / Produits :</b></td><td style="padding: 8px;"><textarea rows="4" style="width: 100%;"></textarea></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Appel a l\'action (CTA) :</b></td><td style="padding: 8px;"><input type="text" placeholder="Ex: -20% ce weekend !" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>nombre de flyer :</b></td><td style="padding: 8px;"><input type="number" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>date et heure livraison :</b></td><td style="padding: 8px;"><input type="time" style="width: 100%;"><input type="date" style="width: 100%;"></td></tr>');
    document.write('<tr><td colspan="2" style="text-align: center; padding-top: 15px;"><input type="submit" value="Valider les informations" style="background-color: red; color: white; border: none; padding: 10px 20px; border-radius: 10px; cursor: pointer; font-weight: bold;"></td></tr>');
    document.write('</table></form></FIELDSET>');
}

function carteentre(){}

function formulairbro() {
    document.write('<FIELDSET style="width: 60%; background: rgb(223,255,223); border: none; border-radius: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); padding: 25px; margin: 25px auto; max-width: 1200px;">');  
    document.write('<LEGEND><b><font color="red">Informations pour votre Brochure</font></b></LEGEND>');
    document.write('<form onsubmit="traiterCommande(event, \'Brochure\', 500)"><table style="width: 100%; border-collapse: collapse;">');
    document.write('<tr><td style="padding: 8px;"><b>Titre de la couverture :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Photo de profil / Logo :</b></td><td style="padding: 8px;"><input type="file" name="fichierIndications" accept="image/*"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Introduction / Presentation :</b></td><td style="padding: 8px;"><textarea rows="3" style="width: 100%;"></textarea></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Details des Services / Produits :</b></td><td style="padding: 8px;"><textarea rows="4" style="width: 100%;"></textarea></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Avantages / Pourquoi nous :</b></td><td style="padding: 8px;"><textarea rows="3" style="width: 100%;"></textarea></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Coordonnees (Contact, Adresse, Site) :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>nombre de brochure:</b></td><td style="padding: 8px;"><input type="number" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>date et heure livraison :</b></td><td style="padding: 8px;"><input type="time" style="width: 100%;"><input type="date" style="width: 100%;"></td></tr>');
    document.write('<tr><td colspan="2" style="text-align: center; padding-top: 20px;"><input type="submit" value="Valider les informations" style="background:#ff8c00; color:white; border:none; padding:10px 20px; border-radius:10px; cursor:pointer; font-weight:bold;"></td></tr>');
    document.write('</table></form></FIELDSET>');
}

function broderis(){
    document.write('<FIELDSET style="width: 60%; background: rgb(223,255,223); border: none; border-radius: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); padding: 25px; margin: 25px auto; max-width: 1200px;">');   
    document.write('<LEGEND><b align="center"><font color="#1b38f4">Informations pour votre accessoire</font></b></LEGEND>');
    document.write('<form onsubmit="traiterCommande(event, \'Broderie Accessoire\', 1500)"><table style="width: 100%; border-collapse: collapse;">');
    document.write('<tr><td style="padding: 8px;"><b>suport a broder :</b></td><td style="padding: 8px;">');
    document.write('<select style="width: 100%; padding: 5px;">');
    document.write('<option value="drapeau">drapeau</option>');
    document.write('<option value="galon">galon</option>');
    document.write('<option value="logo">logo</option>');
    document.write('<option value="text">text</option>');
    document.write('<option value="casquette">casquette</option>');
    document.write('<option value="enblemme">enblemme</option>');
    document.write('<option value="insigne">insigne</option>');
    document.write('<option value="tissus">tissus</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Photo de profil / Logo :</b></td><td style="padding: 8px;"><input type="file" name="fichierIndications" accept="image/*"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><input type="file" ></td></tr>');
    document.write('<tr><td style="padding: 8px;"><input type="file" ></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Texte a broder :</b></td><td style="padding: 8px;"><textarea rows="3" style="width: 100%;">noms et autre element</textarea></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Couleur du text :</b></td><td style="padding: 8px;">');
    document.write('<select style="width: 100%; padding: 5px;">');
    document.write('<option value="bleu">Bleu</option>');
    document.write('<option value="noir">Noir</option>');
    document.write('<option value="rouge">Rouge</option>');
    document.write('<option value="jaunne">jaunne</option>');
    document.write('<option value="orange">orange</option>');
    document.write('<option value="vert">vert</option>');
    document.write('<option value="gris">gris</option>');
    document.write('<option value="rose">rose</option>');
    document.write('<option value="violet">violet</option>');
    document.write('<option value="blanc">Blanc</option>');
    document.write('<option value="maron">maron</option>');
    document.write('<option value="kaki">kaki</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Texte descriptif ou details :</b></td><td style="padding: 8px;"><textarea rows="3" style="width: 100%;">vous pouvez saisir la position de flocage donner des indication sur vos fichier</textarea></td></tr>');
    
    document.write('<tr><td style="padding: 8px;"><b>Qualité du support :</b></td><td style="padding: 8px;">');
    document.write('<select name="QualiteSupport" style="width: 100%; padding: 5px;">');
    document.write('<option value="qualite 1">Qualite 1</option>');
    document.write('<option value="qualite 2">Qualite 2</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Couleur du support :</b></td><td style="padding: 8px;">');
    document.write('<select style="width: 100%; padding: 5px;">');
    document.write('<option value="bleu">Bleu</option>');
    document.write('<option value="noir">Noir</option>');
    document.write('<option value="rouge">Rouge</option>');
    document.write('<option value="jaunne">jaunne</option>');
    document.write('<option value="orange">orange</option>');
    document.write('<option value="vert">vert</option>');
    document.write('<option value="gris">gris</option>');
    document.write('<option value="rose">rose</option>');
    document.write('<option value="violet">violet</option>');
    document.write('<option value="blanc">Blanc</option>');
    document.write('<option value="maron">maron</option>');
    document.write('<option value="kaki">kaki</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>nombre de broderie :</b></td><td style="padding: 8px;"><input type="number" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>date et heure livraison :</b></td><td style="padding: 8px;"><input type="time" style="width: 100%;"><input type="date" style="width: 100%;"></td></tr>');
    document.write('<tr><td colspan="2" style="text-align: center; padding-top: 20px;"><input type="submit" value="Valider les informations" style="background:blue; color:white; border:none; padding:10px 20px; border-radius:10px; cursor:pointer; font-weight:bold;"></td></tr>');
    document.write('</table></form></FIELDSET>');
}

function formulairaffi() {
    document.write('<FIELDSET style="width: 60%; background: rgb(223,255,223); border: none; border-radius: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); padding: 25px; margin: 25px auto; max-width: 1200px;">');   
    document.write('<LEGEND><b><font color="red">Informations pour votre Affiche</font></b></LEGEND>');
    document.write('<form onsubmit="traiterCommande(event, \'Affiche\', 1000)"><table style="width: 100%; border-collapse: collapse;">');
    document.write('<tr><td style="padding: 8px;"><b>Type d\'affiche :</b></td><td style="padding: 8px;">');
    document.write('<select style="width: 100%; padding: 5px;">');
    document.write('<option value="evenement">evenementiel (Concert, Fete, Conference)</option>');
    document.write('<option value="publicite">Publicitaire (Produit, Offre speciale)</option>');
    document.write('<option value="information">Informatif (Sensibilisation, Consignes)</option>');
    document.write('<option value="autre">Autre / Personnalise</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Titre principal / Accroche :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Photo de profil / Logo :</b></td><td style="padding: 8px;"><input type="file" name="fichierIndications" accept="image/*"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Date, Heure et Lieu (si applicable) :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Texte descriptif ou details :</b></td><td style="padding: 8px;"><textarea rows="3" style="width: 100%;"></textarea></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Logo (Optionnel) :</b></td><td style="padding: 8px;"><input type="file" accept="image/*"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>largeur en cm :</b></td><td style="padding: 8px;"><input type="number" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>hauteur en cm :</b></td><td style="padding: 8px;"><input type="number" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>nombre d\'affiche :</b></td><td style="padding: 8px;"><input type="number" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>date et heure livraison :</b></td><td style="padding: 8px;"><input type="time" style="width: 100%;"><input type="date" style="width: 100%;"></td></tr>');
    document.write('<tr><td colspan="2" style="text-align: center; padding-top: 20px;"><input type="submit" value="Valider les informations" style="background:#007bff; color:white; border:none; padding:10px 20px; border-radius:10px; cursor:pointer; font-weight:bold;"></td></tr>');
    document.write('</table></form></FIELDSET>');
}

function formulaircachet() {
    document.write('<FIELDSET style="width: 60%; background: rgb(223,255,223); border: none; border-radius: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); padding: 25px; margin: 25px auto; max-width: 1200px;">');  
    document.write('<LEGEND><b><font color="red">Informations pour votre Cachet</font></b></LEGEND>');
    document.write('<form onsubmit="traiterCommande(event, \'Cachet\', 2500)"><table style="width: 100%; border-collapse: collapse;">');
    document.write('<tr><td style="padding: 8px;"><b>Forme du cachet :</b></td><td style="padding: 8px;">');
    document.write('<select style="width: 100%; padding: 5px;">');
    document.write('<option value="rond">Rond</option>');
    document.write('<option value="rectangle">Rectangulaire</option>');
    document.write('<option value="ovale">Ovale</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Nom de l\'entreprise :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Numero d\'immatriculation / ID :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Adresse / Localisation :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Telephone / Contact :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Couleur d\'encre souhaitee :</b></td><td style="padding: 8px;">');
    document.write('<select style="width: 100%; padding: 5px;">');
    document.write('<option value="bleu">Bleu</option>');
    document.write('<option value="noir">Noir</option>');
    document.write('<option value="rouge">Rouge</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>nombre de cachet :</b></td><td style="padding: 8px;"><input type="number" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>date et heure livraison :</b></td><td style="padding: 8px;"><input type="time" style="width: 100%;"><input type="date" style="width: 100%;"></td></tr>');
    document.write('<tr><td colspan="2" style="text-align: center; padding-top: 20px;"><input type="submit" value="Valider les informations" style="background:#2f4f4f; color:white; border:none; padding:10px 20px; border-radius:10px; cursor:pointer; font-weight:bold;"></td></tr>');
    document.write('</table></form></FIELDSET>');
}

function broderisup(){
    document.write('<FIELDSET style="width: 60%; background: rgb(223,255,223); border: none; border-radius: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); padding: 25px; margin: 25px auto; max-width: 1200px;">');   
    document.write('<LEGEND><b><font color="red">Informations pour votre broderie</font></b></LEGEND>');
    document.write('<LEGEND><b align="center"><font color="#1b38f4">Informations pour votre pull-over</font></b></LEGEND>');
    document.write('<form onsubmit="traiterCommande(event, \'Broderie Pull-over\', 3000)"><table style="width: 100%; border-collapse: collapse;">');
    document.write('<tr><td style="padding: 8px;" rowspan="3"><b>Photo de profil / Logo :</b></td><td style="padding: 8px;"><input type="file" name="fichierIndications" accept="image/*"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><input type="file" accept="image/*"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><input type="file" accept="image/*"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Texte a broder :</b></td><td style="padding: 8px;"><textarea rows="3" style="width: 100%;">noms et autre element</textarea></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Couleur du text :</b></td><td style="padding: 8px;">');
    document.write('<select style="width: 100%; padding: 5px;">');
    document.write('<option value="bleu">Bleu</option>');
    document.write('<option value="noir">Noir</option>');
    document.write('<option value="rouge">Rouge</option>');
    document.write('<option value="jaunne">jaunne</option>');
    document.write('<option value="orange">orange</option>');
    document.write('<option value="vert">vert</option>');
    document.write('<option value="gris">gris</option>');
    document.write('<option value="rose">rose</option>');
    document.write('<option value="violet">violet</option>');
    document.write('<option value="blanc">Blanc</option>');
    document.write('<option value="maron">maron</option>');
    document.write('<option value="kaki">kaki</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Texte descriptif ou details :</b></td><td style="padding: 8px;"><textarea rows="3" style="width: 100%;">vous pouvez saisir la position de flocage donner des indication sur voc fichier</textarea></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Qualité du support :</b></td><td style="padding: 8px;">');
    document.write('<select name="QualiteSupport" style="width: 100%; padding: 5px;">');
    document.write('<option value="qualite 1">Qualite 1</option>');
    document.write('<option value="qualite 2">Qualite 2</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Couleur du support :</b></td><td style="padding: 8px;">');
    document.write('<select style="width: 100%; padding: 5px;">');
    document.write('<option value="bleu">Bleu</option>');
    document.write('<option value="noir">Noir</option>');
    document.write('<option value="rouge">Rouge</option>');
    document.write('<option value="jaunne">jaunne</option>');
    document.write('<option value="orange">orange</option>');
    document.write('<option value="vert">vert</option>');
    document.write('<option value="gris">gris</option>');
    document.write('<option value="rose">rose</option>');
    document.write('<option value="violet">violet</option>');
    document.write('<option value="blanc">Blanc</option>');
    document.write('<option value="maron">maron</option>');
    document.write('<option value="kaki">kaki</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>date et heure livraison :</b></td><td style="padding: 8px;"><input type="time" style="width: 100%;"><input type="date" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>nombre de broderie :</b></td><td style="padding: 8px;"><input type="number" style="width: 100%;"></td></tr>');
    document.write('<tr><td colspan="2" style="text-align: center; padding-top: 20px;"><input type="submit" value="Valider les informations" style="background:blue; color:white; border:none; padding:10px 20px; border-radius:10px; cursor:pointer; font-weight:bold;"></td></tr>');
    document.write('</table></form></FIELDSET>');

    document.write('<FIELDSET style="width: 60%; background: rgb(223,255,223); border: none; border-radius: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); padding: 25px; margin: 25px auto; max-width: 1200px;">');   
    document.write('<LEGEND><b align="center"><font color="#1b38f4">Informations pour votre pantalon</font></b></LEGEND>');
    document.write('<form onsubmit="traiterCommande(event, \'Broderie Pantalon\', 2500)"><table style="width: 100%; border-collapse: collapse;">');
    document.write('<tr><td style="padding: 8px;" rowspan="3"><b>element a broder :</b></td><td style="padding: 8px;"><input type="file" accept="image/*"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><input type="file" accept="image/*"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><input type="file" accept="image/*"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Texte descriptif ou details :</b></td><td style="padding: 8px;"><textarea rows="3" style="width: 100%;">vous pouvez saisir la position de flocage donner des indication sur voc fichier</textarea></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Couleur du support :</b></td><td style="padding: 8px;">');
    document.write('<select style="width: 100%; padding: 5px;">');
    document.write('<option value="bleu">Bleu</option>');
    document.write('<option value="noir">Noir</option>');
    document.write('<option value="rouge">Rouge</option>');
    document.write('<option value="jaunne">jaunne</option>');
    document.write('<option value="orange">orange</option>');
    document.write('<option value="vert">vert</option>');
    document.write('<option value="gris">gris</option>');
    document.write('<option value="rose">rose</option>');
    document.write('<option value="violet">violet</option>');
    document.write('<option value="blanc">Blanc</option>');
    document.write('<option value="maron">maron</option>');
    document.write('<option value="kaki">kaki</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Qualité du support :</b></td><td style="padding: 8px;">');
    document.write('<select name="QualiteSupport" style="width: 100%; padding: 5px;">');
    document.write('<option value="qualite 1">Qualite 1</option>');
    document.write('<option value="qualite 2">Qualite 2</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>nombre de broderie :</b></td><td style="padding: 8px;"><input type="number" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>date et heure livraison :</b></td><td style="padding: 8px;"><input type="time" style="width: 100%;"><input type="date" style="width: 100%;"></td></tr>');
    document.write('<tr><td colspan="2" style="text-align: center; padding-top: 20px;"><input type="submit" value="Valider les informations" style="background:blue; color:white; border:none; padding:10px 20px; border-radius:10px; cursor:pointer; font-weight:bold;"></td></tr>');
    document.write('</table></form></FIELDSET>');
}

function formulairlogo() {
    document.write('<FIELDSET style="width: 60%; background: rgb(223,255,223); border: none; border-radius: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); padding: 25px; margin: 25px auto; max-width: 1200px;">'); 
    document.write('<LEGEND><b><font color="red">Informations pour votre Logo</font></b></LEGEND>');
    document.write('<form onsubmit="traiterCommande(event, \'Création Logo\', 15000)"><table style="width: 100%; border-collapse: collapse;">');
    document.write('<tr><td style="padding: 8px;"><b>Nom de la marque / entreprise :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Slogan (Optionnel) :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Style graphique souhaite :</b></td><td style="padding: 8px;">');
    document.write('<select style="width: 100%; padding: 5px;">');
    document.write('<option value="moderne">Moderne & Epure</option>');
    document.write('<option value="minimaliste">Minimaliste</option>');
    document.write('<option value="classique">Classique & Professionnel</option>');
    document.write('<option value="mascotte">Mascotte / Illustratif</option>');
    document.write('<option value="abstrait">Abstrait</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Couleurs preferees :</b></td><td style="padding: 8px;"><input type="text" placeholder="Ex: Bleu et Blanc, Ton chaud..." style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Description / Idees du projet :</b></td><td style="padding: 8px;"><textarea rows="3" style="width: 100%;" placeholder="Decrivez l\'esprit de votre entreprise..."></textarea></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Croquis ou reference (Optionnel) :</b></td><td style="padding: 8px;"><input type="file" accept="image/*"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>date et heure livraison :</b></td><td style="padding: 8px;"><input type="time" style="width: 100%;"><input type="date" style="width: 100%;"></td></tr>');
    document.write('<tr><td colspan="2" style="text-align: center; padding-top: 20px;"><input type="submit" value="Valider les informations" style="background:orange; color:white; border:none; padding:10px 20px; border-radius:10px; cursor:pointer; font-weight:bold;"></td></tr>');
    document.write('</table></form></FIELDSET>');
}

function flocage(){
    document.write('<FIELDSET style="width: 60%; background: rgb(223,255,223); border: none; border-radius: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); padding: 25px; margin: 25px auto; max-width: 1200px;">');   
    document.write('<LEGEND><b><font color="red">Informations pour votre impression</font></b></LEGEND>');
    document.write('<LEGEND><b align="center"><font color="#1b38f4">Informations pour votre floquage</font></b></LEGEND>');
    document.write('<form onsubmit="traiterCommande(event, \'Flocage\', 2000)"><table style="width: 100%; border-collapse: collapse;">');
    document.write('<tr><td style="padding: 8px;"><b>object a floquer :</b></td><td style="padding: 8px;">');
    document.write('<select style="width: 100%; padding: 5px;">');
    document.write('<option value="polo">polo</option>');
    document.write('<option value="maillo">maillo</option>');
    document.write('<option value="tasse">tasse</option>');
    document.write('<option value="stylo">stylo</option>');
    document.write('<option value="djoking">djoking</option>');
    document.write('<option value="parapluis">parapluis</option>');
    document.write('<option value="parassol">parasol</option>');
    document.write('<option value="autre accessoire">autre accessoire</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;" rowspan="3"><b>Photo de profil / Logo :</b></td><td style="padding: 8px;"><input type="file" name="fichierIndications" accept="image/*"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><input type="file" accept="image/*"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><input type="file" accept="image/*"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Texte descriptif ou details :</b></td><td style="padding: 8px;"><textarea rows="3" style="width: 100%;">vous pouvez saisir la position de flocage donner des indication sur vos fichier</textarea></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>type de floquage :</b></td><td style="padding: 8px;">');
    document.write('<select style="width: 100%; padding: 5px;">');
    document.write('<option value="DTF">DTF</option>');
    document.write('<option value="LAZER">LAZER</option>');
    document.write('<option value="sublimation">SUBLIMATION</OPTION>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Qualité du support :</b></td><td style="padding: 8px;">');
    document.write('<select name="QualiteSupport" style="width: 100%; padding: 5px;">');
    document.write('<option value="qualite 1">Qualite 1</option>');
    document.write('<option value="qualite 2">Qualite 2</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Couleur du support :</b></td><td style="padding: 8px;">');
    document.write('<select style="width: 100%; padding: 5px;">');
    document.write('<option value="bleu">Bleu</option>');
    document.write('<option value="noir">Noir</option>');
    document.write('<option value="rouge">Rouge</option>');
    document.write('<option value="jaunne">jaunne</option>');
    document.write('<option value="orange">orange</option>');
    document.write('<option value="vert">vert</option>');
    document.write('<option value="gris">gris</option>');
    document.write('<option value="rose">rose</option>');
    document.write('<option value="violet">violet</option>');
    document.write('<option value="blanc">Blanc</option>');
    document.write('<option value="maron">maron</option>');
    document.write('<option value="kaki">kaki</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>nombre de suport :</b></td><td style="padding: 8px;"><input type="number" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>date et heure livraison :</b></td><td style="padding: 8px;"><input type="time" style="width: 100%;"><input type="date" style="width: 100%;"></td></tr>');
    document.write('<tr><td colspan="2" style="text-align: center; padding-top: 20px;"><input type="submit" value="Valider les informations" style="background:blue; color:white; border:none; padding:10px 20px; border-radius:10px; cursor:pointer; font-weight:bold;"></td></tr>');
    document.write('</table></form></FIELDSET>');
}

function formulaircach() {
    document.write('<FIELDSET style="width: 60%; background: rgb(223,255,223); border: none; border-radius: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); padding: 25px; margin: 25px auto; max-width: 1200px;">');   
    document.write('<LEGEND><b><font color="red">Informations pour votre Logo</font></b></LEGEND>');
    document.write('<LEGEND><b align="center"><font color="#1b38f4">Informations pour votre Cachet</font></b></LEGEND>');
    document.write('<form onsubmit="traiterCommande(event, \'Cachet Spécial\', 3000)"><table style="width: 100%; border-collapse: collapse;">');
    document.write('<tr><td style="padding: 8px;"><b>Forme du cachet :</b></td><td style="padding: 8px;">');
    document.write('<select style="width: 100%; padding: 5px;">');
    document.write('<option value="rond">Rond</option>');
    document.write('<option value="rectangle">Rectangulaire</option>');
    document.write('<option value="ovale">Ovale</option>');
    document.write('<option value="carre">carre</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Nom de l\'entreprise :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Numero d\'immatriculation / ID :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Adresse / Localisation :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Telephone / Contact :</b></td><td style="padding: 8px;"><input type="text" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Couleur d\'encre souhaitee :</b></td><td style="padding: 8px;">');
    document.write('<select style="width: 100%; padding: 5px;">');
    document.write('<option value="bleu">Bleu</option>');
    document.write('<option value="noir">Noir</option>');
    document.write('<option value="rouge">Rouge</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Technologie :</b></td><td style="padding: 8px;">');
    document.write('<select style="width: 100%; padding: 5px;">');
    document.write('<option value="A resine">A resine</option>');
    document.write('<option value="Numerique">Numerique</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>nombre de cachet :</b></td><td style="padding: 8px;"><input type="number" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>date et heure livraison :</b></td><td style="padding: 8px;"><input type="time" style="width: 100%;"><input type="date" style="width: 100%;"></td></tr>');
    document.write('<tr><td colspan="2" style="text-align: center; padding-top: 20px;"><input type="submit" value="Valider les informations" style="background:blue; color:white; border:none; padding:10px 20px; border-radius:10px; cursor:pointer; font-weight:bold;"></td></tr>');
    document.write('</table></form></FIELDSET>');
}

function impression(){
    document.write('<FIELDSET style="width: 60%; background: rgb(223,255,223); border: none; border-radius: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); padding: 25px; margin: 25px auto; max-width: 1200px;">');   
    document.write('<LEGEND><b><font color="red">Informations pour votre impression</font></b></LEGEND>');
    document.write('<LEGEND><b align="center"><font color="#1b38f4">Informations pour votre impression</font></b></LEGEND>');
    document.write('<form onsubmit="traiterCommande(event, \'Impression\', 50)"><table style="width: 100%; border-collapse: collapse;">');
    document.write('<tr><td style="padding: 8px;"><b>object imprimer :</b></td><td style="padding: 8px;">');
    document.write('<select style="width: 100%; padding: 5px;">');
    document.write('<option value="affiche">affiche</option>');
    document.write('<option value="bache">bache</option>');
    document.write('<option value="livre">livre</option>');
    document.write('<option value="carte de visite">carte de visit</option>');
    document.write('<option value="brochure">brochure</option>');
    document.write('<option value="document">document</option>');
    document.write('<option value="raport">raport</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Photo de profil / Logo :</b></td><td style="padding: 8px;"><input type="file" name="fichierIndications" accept="image/*"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><input type="file"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><input type="file"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Texte descriptif ou details :</b></td><td style="padding: 8px;"><textarea rows="3" style="width: 100%;">vous pouvez saisir la position de flocage donner des indication sur voc fichier</textarea></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>type impression :</b></td><td style="padding: 8px;">');
    document.write('<select style="width: 100%; padding: 5px;">');
    document.write('<option value="en couleur">en couleur</option>');
    document.write('<option value="noir sur blanc">Noir sur blanc</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>largeur en cm :</b></td><td style="padding: 8px;"><input type="number" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>hauteur en cm :</b></td><td style="padding: 8px;"><input type="number" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Format :</b></td><td style="padding: 8px;">');
    document.write('<select style="width: 100%; padding: 5px;">');
    document.write('<option value="A5">A5</option>');
    document.write('<option value="A4">A4</option>');
    document.write('<option value="A3">A3</option>');
    document.write('<option value="A2">A2</option>');
    document.write('<option value="A1">A1</option>');
    document.write('<option value="B5">B5</option>');
    document.write('<option value="B4">B4</option>');
    document.write('<option value="B3">B3</option>');
    document.write('<option value="B2">B2</option>');
    document.write('<option value="B1">B1</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>impression :</b></td><td style="padding: 8px;"><input type="number" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>date et heure livraison :</b></td><td style="padding: 8px;"><input type="time" style="width: 100%;"><input type="date" style="width: 100%;"></td></tr>');
    document.write('<tr><td colspan="2" style="text-align: center; padding-top: 20px;"><input type="submit" value="Valider les informations" style="background:blue; color:white; border:none; padding:10px 20px; border-radius:10px; cursor:pointer; font-weight:bold;"></td></tr>');
    document.write('</table></form></FIELDSET>');
}

function broderisimp() {
    document.write('<FIELDSET style="width: 60%; background: rgb(223,255,223); border: none; border-radius: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); padding: 25px; margin: 25px auto; max-width: 1200px;">');   
    document.write('<LEGEND><b><font color="red">Informations pour votre broderie</font></b></LEGEND>');
    document.write('<LEGEND><b align="center"><font color="#1b38f4">Informations pour votre broderie</font></b></LEGEND>');
    document.write('<form onsubmit="traiterCommande(event, \'Broderie Simple\', 2000)"><table style="width: 100%; border-collapse: collapse;">');
    document.write('<tr><td style="padding: 8px;"><b>suport a broder :</b></td><td style="padding: 8px;">');
    document.write('<select style="width: 100%; padding: 5px;">');
    document.write('<option value="polo">polo</option>');
    document.write('<option value="chapeau">chapeau</option>');
    document.write('<option value="t-shirt">t-shirt</option>');
    document.write('<option value="t-shirt">chemise</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;" rowspan="3"><b>Emplacement :</b></td><td style="padding: 8px;">');
    document.write('<select style="width: 100%; padding: 5px;">');
    document.write('<option value="Cœur (Côté gauche)">Cœur (Côté gauche)</option>');
    document.write('<option value="Centré Face">Centré Face</option>');
    document.write('<option value="Grand Dos">Grand Dos</option>');
    document.write('<option value="Manche">Manche</option>');
    document.write('<option value="Plusieurs emplacements">Plusieurs emplacements</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td><select style="width: 100%; padding: 5px;">');
    document.write('<option value="Cœur (Côté gauche)">Cœur (Côté gauche)</option>');
    document.write('<option value="Centré Face">Centré Face</option>');
    document.write('<option value="Grand Dos">Grand Dos</option>');
    document.write('<option value="Manche">Manche</option>');
    document.write('<option value="Plusieurs emplacements">Plusieurs emplacements</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td><select style="width: 100%; padding: 5px;">');
    document.write('<option value="Cœur (Côté gauche)">Cœur (Côté gauche)</option>');
    document.write('<option value="Centré Face">Centré Face</option>');
    document.write('<option value="Grand Dos">Grand Dos</option>');
    document.write('<option value="Manche">Manche</option>');
    document.write('<option value="Plusieurs emplacements">Plusieurs emplacements</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;" rowspan="3"><b>Photo de profil / Logo :</b></td><td style="padding: 8px;"><input type="file" name="fichierIndications" accept="image/*"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><input type="file" accept="image/*"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><input type="file" accept="image/*"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Texte a broder :</b></td><td style="padding: 8px;"><textarea rows="3" style="width: 100%;">noms et autre element</textarea></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Couleur du text :</b></td><td style="padding: 8px;">');
    document.write('<select style="width: 100%; padding: 5px;">');
    document.write('<option value="bleu">Bleu</option>');
    document.write('<option value="noir">Noir</option>');
    document.write('<option value="rouge">Rouge</option>');
    document.write('<option value="jaunne">jaunne</option>');
    document.write('<option value="orange">orange</option>');
    document.write('<option value="vert">vert</option>');
    document.write('<option value="gris">gris</option>');
    document.write('<option value="rose">rose</option>');
    document.write('<option value="violet">violet</option>');
    document.write('<option value="blanc">Blanc</option>');
    document.write('<option value="maron">maron</option>');
    document.write('<option value="kaki">kaki</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Texte descriptif ou details :</b></td><td style="padding: 8px;"><textarea rows="3" style="width: 100%;">vous pouvez saisir la position de flocage donner des indication sur voc fichier</textarea></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Couleur du support :</b></td><td style="padding: 8px;">');
    document.write('<select style="width: 100%; padding: 5px;">');
    document.write('<option value="bleu">Bleu</option>');
    document.write('<option value="noir">Noir</option>');
    document.write('<option value="rouge">Rouge</option>');
    document.write('<option value="jaunne">jaunne</option>');
    document.write('<option value="orange">orange</option>');
    document.write('<option value="vert">vert</option>');
    document.write('<option value="gris">gris</option>');
    document.write('<option value="rose">rose</option>');
    document.write('<option value="violet">violet</option>');
    document.write('<option value="blanc">Blanc</option>');
    document.write('<option value="maron">maron</option>');
    document.write('<option value="kaki">kaki</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Qualité du support :</b></td><td style="padding: 8px;">');
    document.write('<select name="QualiteSupport" style="width: 100%; padding: 5px;">');
    document.write('<option value="qualite 1">Qualite 1</option>');
    document.write('<option value="qualite 2">Qualite 2</option>');
    document.write('</select></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>nombre de broderie :</b></td><td style="padding: 8px;"><input type="number" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>date et heure livraison :</b></td><td style="padding: 8px;"><input type="time" style="width: 100%;"><input type="date" style="width: 100%;"></td></tr>');
    document.write('<tr><td colspan="2" style="text-align: center; padding-top: 20px;"><input type="submit" value="Valider les informations" style="background:blue; color:white; border:none; padding:10px 20px; border-radius:10px; cursor:pointer; font-weight:bold;"></td></tr>');
    document.write('</table></form></FIELDSET>');
}

function formulairCatalogueBanniere() {
    document.write('<FIELDSET style="width: 60%; background: rgb(223,255,223); border: none; border-radius: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); padding: 25px; margin: 25px auto; max-width: 1200px;">');   
    document.write('<LEGEND><b><font color="red">Informations pour Catalogue, Bannière ou Banderole</font></b></LEGEND>');
    document.write('<form onsubmit="traiterCommande(event, \'Catalogue / Bannière / Banderole\', 25)"><table style="width: 100%; border-collapse: collapse;">');
    
    document.write('<tr><td style="padding: 8px;"><b>Type de produit :</b></td><td style="padding: 8px;">');
    document.write('<select name="TypeProduit" style="width: 100%; padding: 5px;">');
    document.write('<option value="Banderole">Banderole</option>');
    document.write('<option value="Banniere">Bannière</option>');
    document.write('<option value="Catalogue">Catalogue</option>');
    document.write('</select></td></tr>');

    document.write('<tr><td style="padding: 8px;"><b>Qualité du support :</b></td><td style="padding: 8px;">');
    document.write('<select name="QualiteSupport" style="width: 100%; padding: 5px;">');
    document.write('<option value="Standard">Standard (Économique)</option>');
    document.write('<option value="Moyenne">Moyenne (Standard +)</option>');
    document.write('<option value="Haute Qualité">Haute Qualité / Supérieure</option>');
    document.write('<option value="Premium HD">Premium HD (Longue durée)</option>');
    document.write('</select></td></tr>');

    document.write('<tr><td style="padding: 8px;"><b>Matière du support :</b></td><td style="padding: 8px;">');
    document.write('<select name="MatiereSupport" style="width: 100%; padding: 5px;">');
    document.write('<option value="Bâche PVC">Bâche PVC</option>');
    document.write('<option value="Bâche Micro-perforée">Bâche Micro-perforée (Mesh)</option>');
    document.write('<option value="Tissu Polyester">Tissu Polyester</option>');
    document.write('<option value="Papier Glacé">Papier Glacé (Pour Catalogue)</option>');
    document.write('</select></td></tr>');

    document.write('<tr><td style="padding: 8px;"><b>Largeur (en cm) :</b></td><td style="padding: 8px;"><input type="number" name="Largeur" style="width: 100%;" required></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Hauteur (en cm) :</b></td><td style="padding: 8px;"><input type="number" name="Hauteur" style="width: 100%;" required></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Visuel / Maquette / Logo :</b></td><td style="padding: 8px;"><input type="file" name="fichierIndications" accept="image/*,application/pdf"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Identité virtuelle (Lien / Réseaux) :</b></td><td style="padding: 8px;"><input type="text" name="IdentiteVirtuelle" placeholder="Page Facebook, Site Web, QR Code..." style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Consignes & Finitions (Œillets, Ourlets...) :</b></td><td style="padding: 8px;"><textarea name="Indications" rows="3" style="width: 100%;"></textarea></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Quantité :</b></td><td style="padding: 8px;"><input type="number" name="Quantite" value="1" min="1" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Date et heure de livraison souhaitée :</b></td><td style="padding: 8px;"><input type="time" name="HeureLivraison" style="width: 48%; margin-right: 2%;"><input type="date" name="DateLivraison" style="width: 48%;"></td></tr>');
    document.write('<tr><td colspan="2" style="text-align: center; padding-top: 20px;"><input type="submit" value="Valider la commande (Prix de base: 25 FCFA)" style="background:#1d7ab3; color:white; border:none; padding:10px 20px; border-radius:10px; cursor:pointer; font-weight:bold;"></td></tr>');
    document.write('</table></form></FIELDSET>');
}

function impressionDTF() {
    document.write('<FIELDSET style="width: 60%; background: rgb(223,255,223); border: none; border-radius: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); padding: 25px; margin: 25px auto; max-width: 1200px;">');   
    document.write('<LEGEND><b><font color="red">Informations pour Impression DTF</font></b></LEGEND>');
    document.write('<form onsubmit="traiterCommande(event, \'Impression DTF\', 25)"><table style="width: 100%; border-collapse: collapse;">');
    
    document.write('<tr><td style="padding: 8px;"><b>Support à imprimer :</b></td><td style="padding: 8px;">');
    document.write('<select name="SupportDTF" style="width: 100%; padding: 5px;">');
    document.write('<option value="Film DTF Seul (Mètre linéaire)">Film DTF Seul (au mètre)</option>');
    document.write('<option value="T-Shirt">T-Shirt</option>');
    document.write('<option value="Polo">Polo</option>');
    document.write('<option value="Pull-over / Hoodie">Pull-over / Hoodie</option>');
    document.write('<option value="Casquette">Casquette</option>');
    document.write('<option value="Sac / Tote bag">Sac / Tote bag</option>');
    document.write('</select></td></tr>');

    document.write('<tr><td style="padding: 8px;"><b>Qualité du support :</b></td><td style="padding: 8px;">');
    document.write('<select name="QualiteSupport" style="width: 100%; padding: 5px;">');
    document.write('<option value="Standard (Coton basique)">Standard (Coton basique)</option>');
    document.write('<option value="Supérieure (Coton Peigné)">Supérieure (Coton Peigné)</option>');
    document.write('<option value="Premium High Class">Premium High Class (Épais & Résistant)</option>');
    document.write('</select></td></tr>');

    document.write('<tr><td style="padding: 8px;"><b>Visuel DTF à imprimer :</b></td><td style="padding: 8px;"><input type="file" name="fichierIndications" accept="image/*,application/pdf"></td></tr>');

    document.write('<tr><td style="padding: 8px;"><b>Emplacement du transfert :</b></td><td style="padding: 8px;">');
    document.write('<select name="Emplacement" style="width: 100%; padding: 5px;">');
    document.write('<option value="Cœur (Côté gauche)">Cœur (Côté gauche)</option>');
    document.write('<option value="Centré Face">Centré Face</option>');
    document.write('<option value="Grand Dos">Grand Dos</option>');
    document.write('<option value="Manche">Manche</option>');
    document.write('<option value="Plusieurs emplacements">Plusieurs emplacements</option>');
    document.write('</select></td></tr>');

    document.write('<tr><td style="padding: 8px;"><b>Identité virtuelle (Lien / Réseaux) :</b></td><td style="padding: 8px;"><input type="text" name="IdentiteVirtuelle" placeholder="Lien vers votre boutique, logo digital..." style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Quantité :</b></td><td style="padding: 8px;"><input type="number" name="Quantite" value="1" min="1" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Date et heure de livraison :</b></td><td style="padding: 8px;"><input type="time" name="HeureLivraison" style="width: 48%; margin-right: 2%;"><input type="date" name="DateLivraison" style="width: 48%;"></td></tr>');
    document.write('<tr><td colspan="2" style="text-align: center; padding-top: 20px;"><input type="submit" value="Valider l\'impression DTF" style="background:green; color:white; border:none; padding:10px 20px; border-radius:10px; cursor:pointer; font-weight:bold;"></td></tr>');
    document.write('</table></form></FIELDSET>');
}

function rollup() {
    document.write('<FIELDSET style="width: 60%; background: rgb(223,255,223); border: none; border-radius: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); padding: 25px; margin: 25px auto; max-width: 1200px;">');   
    document.write('<LEGEND><b><font color="red">Informations pour votre Roll-up</font></b></LEGEND>');
    document.write('<form onsubmit="traiterCommande(event, \'Roll-up\', 15000)"><table style="width: 100%; border-collapse: collapse;">');
    
    document.write('<tr><td style="padding: 8px;"><b>Nom de l\'entreprise / Projet :</b></td><td style="padding: 8px;"><input type="text" name="NomEntreprise" style="width: 100%;" required></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Slogan / Message clé :</b></td><td style="padding: 8px;"><input type="text" name="Slogan" style="width: 100%;"></td></tr>');
    
    document.write('<tr><td style="padding: 8px;"><b>Type de structure :</b></td><td style="padding: 8px;">');
    document.write('<select name="TypeStructure" style="width: 100%; padding: 5px;">');
    document.write('<option value="Roll-up Standard (Aluminium)">Roll-up Standard (Aluminium)</option>');
    document.write('<option value="Roll-up Premium (Pied renforcé)">Roll-up Premium (Pied renforcé)</option>');
    document.write('<option value="Visuel seul (Sans structure)">Visuel seul (Sans structure)</option>');
    document.write('</select></td></tr>');

    document.write('<tr><td style="padding: 8px;"><b>Dimensions :</b></td><td style="padding: 8px;">');
    document.write('<select name="Dimensions" style="width: 100%; padding: 5px;">');
    document.write('<option value="85x200 cm">85 x 200 cm (Standard)</option>');
    document.write('<option value="100x200 cm">100 x 200 cm</option>');
    document.write('<option value="120x200 cm">120 x 200 cm</option>');
    document.write('<option value="150x200 cm">150 x 200 cm</option>');
    document.write('</select></td></tr>');

    document.write('<tr><td style="padding: 8px;"><b>Maquette / Logo / Fichier :</b></td><td style="padding: 8px;"><input type="file" name="fichierIndications" accept="image/*,application/pdf"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Consignes et couleurs souhaitées :</b></td><td style="padding: 8px;"><textarea name="Indications" rows="3" style="width: 100%;"></textarea></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Nombre de Roll-up :</b></td><td style="padding: 8px;"><input type="number" name="Quantite" value="1" min="1" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Date et heure de livraison :</b></td><td style="padding: 8px;"><input type="time" name="HeureLivraison" style="width: 48%; margin-right: 2%;"><input type="date" name="DateLivraison" style="width: 48%;"></td></tr>');
    document.write('<tr><td colspan="2" style="text-align: center; padding-top: 20px;"><input type="submit" value="Valider la commande" style="background:#1d7ab3; color:white; border:none; padding:10px 20px; border-radius:10px; cursor:pointer; font-weight:bold;"></td></tr>');
    document.write('</table></form></FIELDSET>');
}

function charteGraphique() {
    document.write('<FIELDSET style="width: 60%; background: rgb(223,255,223); border: none; border-radius: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); padding: 25px; margin: 25px auto; max-width: 1200px;">');   
    document.write('<LEGEND><b><font color="red">Informations pour votre Charte Graphique</font></b></LEGEND>');
    document.write('<form onsubmit="traiterCommande(event, \'Charte Graphique\', 50000)"><table style="width: 100%; border-collapse: collapse;">');
    
    document.write('<tr><td style="padding: 8px;"><b>Nom de la marque / Entreprise :</b></td><td style="padding: 8px;"><input type="text" name="NomMarque" style="width: 100%;" required></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Secteur d\'activité :</b></td><td style="padding: 8px;"><input type="text" name="Secteur" style="width: 100%;"></td></tr>');
    
    document.write('<tr><td style="padding: 8px;"><b>Formule souhaitée :</b></td><td style="padding: 8px;">');
    document.write('<select name="FormuleCharte" style="width: 100%; padding: 5px;">');
    document.write('<option value="Essentielle (Logo + Palette + Typographies)">Essentielle (Logo, Palette de couleurs, Typographies)</option>');
    document.write('<option value="Complet (Essentielle + Règles d\'utilisation + Declinaisons)">Complète (Guide de marque complet)</option>');
    document.write('<option value="Premium (Complet + Modèles réseaux sociaux & papeterie)">Premium (Charte complète + Kits Réseaux & Papeterie)</option>');
    document.write('</select></td></tr>');

    document.write('<tr><td style="padding: 8px;"><b>Couleurs et style souhaités :</b></td><td style="padding: 8px;"><input type="text" name="StyleCouleurs" placeholder="Ex: Moderne, minimaliste, tons bleus..." style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Logo actuel ou Croquis (si existant) :</b></td><td style="padding: 8px;"><input type="file" name="fichierIndications" accept="image/*,application/pdf"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Description / Vision de la marque :</b></td><td style="padding: 8px;"><textarea name="VisionMarque" rows="4" style="width: 100%;" placeholder="Décrivez l\'histoire et les valeurs de votre entreprise..."></textarea></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Date de livraison souhaitée :</b></td><td style="padding: 8px;"><input type="date" name="DateLivraison" style="width: 100%;"></td></tr>');
    document.write('<tr><td colspan="2" style="text-align: center; padding-top: 20px;"><input type="submit" value="Valider la commande" style="background:#ff8c00; color:white; border:none; padding:10px 20px; border-radius:10px; cursor:pointer; font-weight:bold;"></td></tr>');
    document.write('</table></form></FIELDSET>');
}

function identiteVirtuelle() {
    document.write('<FIELDSET style="width: 60%; background: rgb(223,255,223); border: none; border-radius: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); padding: 25px; margin: 25px auto; max-width: 1200px;">');   
    document.write('<LEGEND><b><font color="red">Informations pour votre Identité Virtuelle</font></b></LEGEND>');
    document.write('<form onsubmit="traiterCommande(event, \'Identité Virtuelle\', 30000)"><table style="width: 100%; border-collapse: collapse;">');
    
    document.write('<tr><td style="padding: 8px;"><b>Nom du profil / Marque :</b></td><td style="padding: 8px;"><input type="text" name="NomProfil" style="width: 100%;" required></td></tr>');
    
    document.write('<tr><td style="padding: 8px;"><b>Pack Réseaux / Identité :</b></td><td style="padding: 8px;">');
    document.write('<select name="PackVirtuel" style="width: 100%; padding: 5px;">');
    document.write('<option value="Pack Photo de profil & Bannière">Pack Photo de profil & Bannières (FB, LinkedIn, X...)</option>');
    document.write('<option value="Pack Templates Publications">Pack Modèles de publications (Instagram / FB)</option>');
    document.write('<option value="Pack Brand Digital Complet">Pack Brand Digital (Profil, Bannières, Templates & Signature Email)</option>');
    document.write('</select></td></tr>');

    document.write('<tr><td style="padding: 8px;"><b>Plateformes ciblées :</b></td><td style="padding: 8px;"><input type="text" name="Plateformes" placeholder="Ex: Facebook, Instagram, LinkedIn, TikTok..." style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Lien des réseaux actuels / Site Web :</b></td><td style="padding: 8px;"><input type="text" name="LiensExistants" placeholder="https://..." style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Logo / Éléments visuels existants :</b></td><td style="padding: 8px;"><input type="file" name="fichierIndications" accept="image/*,application/pdf"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Instructions & Textes à inclure :</b></td><td style="padding: 8px;"><textarea name="Indications" rows="3" style="width: 100%;"></textarea></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Date de livraison souhaitée :</b></td><td style="padding: 8px;"><input type="date" name="DateLivraison" style="width: 100%;"></td></tr>');
    document.write('<tr><td colspan="2" style="text-align: center; padding-top: 20px;"><input type="submit" value="Valider la commande" style="background:#28a745; color:white; border:none; padding:10px 20px; border-radius:10px; cursor:pointer; font-weight:bold;"></td></tr>');
    document.write('</table></form></FIELDSET>');
}

function fiche() {
    document.write('<FIELDSET style="width: 60%; background: rgb(223,255,223); border: none; border-radius: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); padding: 25px; margin: 25px auto; max-width: 1200px;">');   
    document.write('<LEGEND><b><font color="red">Informations pour vos Fiches</font></b></LEGEND>');
    document.write('<form onsubmit="traiterCommande(event, \'Fiche de Renseignement / Technique\', 100)"><table style="width: 100%; border-collapse: collapse;">');
    
    document.write('<tr><td style="padding: 8px;"><b>Type de fiche :</b></td><td style="padding: 8px;">');
    document.write('<select name="TypeFiche" style="width: 100%; padding: 5px;">');
    document.write('<option value="Fiche de Renseignement">Fiche de Renseignement</option>');
    document.write('<option value="Fiche Technique">Fiche Technique</option>');
    document.write('<option value="Fiche d Inscription">Fiche d\'Inscription</option>');
    document.write('<option value="Fiche de Suivi / Patient">Fiche de Suivi / Patient</option>');
    document.write('<option value="Autre Fiche">Autre Fiche Personnalisée</option>');
    document.write('</select></td></tr>');

    document.write('<tr><td style="padding: 8px;"><b>Nom de l éthablissement / Entreprise :</b></td><td style="padding: 8px;"><input type="text" name="NomStructure" style="width: 100%;" required></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Titre principal de la fiche :</b></td><td style="padding: 8px;"><input type="text" name="TitreFiche" placeholder="Ex: FICHE D INSCRIPTION 2024" style="width: 100%;" required></td></tr>');
    
    document.write('<tr><td style="padding: 8px;"><b>Qualité du support :</b></td><td style="padding: 8px;">');
    document.write('<select name="QualiteSupport" style="width: 100%; padding: 5px;">');
    document.write('<option value="qualite 1">Qualité 1</option>');
    document.write('<option value="qualite 2">Qualité 2</option>');
    document.write('</select></td></tr>');

    document.write('<tr><td style="padding: 8px;"><b>Format de la fiche :</b></td><td style="padding: 8px;">');
    document.write('<select name="Format" style="width: 100%; padding: 5px;">');
    document.write('<option value="A4">A4 (Standard)</option>');
    document.write('<option value="A5">A5 (Demi-feuille)</option>');
    document.write('<option value="A3">A3</option>');
    document.write('</select></td></tr>');

    document.write('<tr><td style="padding: 8px;"><b>Orientation :</b></td><td style="padding: 8px;">');
    document.write('<select name="Orientation" style="width: 100%; padding: 5px;">');
    document.write('<option value="Portrait (Vertical)">Portrait (Vertical)</option>');
    document.write('<option value="Paysage (Horizontal)">Paysage (Horizontal)</option>');
    document.write('</select></td></tr>');

    document.write('<tr><td style="padding: 8px;"><b>Type d impression :</b></td><td style="padding: 8px;">');
    document.write('<select name="TypeImpression" style="width: 100%; padding: 5px;">');
    document.write('<option value="Noir sur Blanc">Noir sur Blanc</option>');
    document.write('<option value="En Couleur">En Couleur</option>');
    document.write('<option value="Recto Simpl">Recto Simple</option>');
    document.write('<option value="Recto / Verso">Recto / Verso</option>');
    document.write('</select></td></tr>');

    document.write('<tr><td style="padding: 8px;"><b>Logo / En-tête (Fichier) :</b></td><td style="padding: 8px;"><input type="file" name="fichierIndications" accept="image/*,application/pdf"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Champs / Textes à inclure :</b></td><td style="padding: 8px;"><textarea name="Indications" rows="4" placeholder="Listez les informations ou cases à remplir sur la fiche..." style="width: 100%;"></textarea></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Nombre de fiches :</b></td><td style="padding: 8px;"><input type="number" name="Quantite" value="1" min="1" style="width: 100%;"></td></tr>');
    document.write('<tr><td style="padding: 8px;"><b>Date et heure de livraison :</b></td><td style="padding: 8px;"><input type="time" name="HeureLivraison" style="width: 48%; margin-right: 2%;"><input type="date" name="DateLivraison" style="width: 48%;"></td></tr>');
    
    document.write('<tr><td colspan="2" style="text-align: center; padding-top: 20px;"><input type="submit" value="Valider les informations" style="background:#007bff; color:white; border:none; padding:10px 20px; border-radius:10px; cursor:pointer; font-weight:bold;"></td></tr>');
    document.write('</table></form></FIELDSET>');
}
