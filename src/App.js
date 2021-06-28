import './App.css';
import React, { useEffect } from 'react'
import { useState } from 'react'
import { Formik } from 'formik'
import * as Yup from 'yup'
import produce from 'immer'
import moment from 'moment'
import { confirmAlert } from 'react-confirm-alert'
import 'react-confirm-alert/src/react-confirm-alert.css'

/**
 * Société Coopérative d'Habitants Simulator.
 */
function App() {

  // Init
  const hiddenFileImportInputRef = React.useRef(null)

  // Configuration simulateur
  const [dureeSimulation, setDureeSimulation] = useState(40)
  const [dureePret, setDureePret] = useState(20)

  // Valeur par défaut ajout habitant
  const [ccaInitialParDefaut, setCcaInitialParDefaut] = useState(50000)
  const [pourcentageDonProjetPretEnCoursParDefaut, setPourcentageDonProjetPretEnCoursParDefaut] = useState(5)
  const [pourcentageReserveHabitantPretEnCoursParDefaut, setPourcentageReserveHabitantPretEnCoursParDefaut] = useState(15)
  const [redevanceAcquisitivePretEnCoursParDefaut, setRedevanceAcquisitivePretEnCoursParDefaut] = useState(890)
  const [pourcentageDonProjetPretTermineParDefaut, setPourcentageDonProjetPretTermineParDefaut] = useState(20)
  const [pourcentageReserveHabitantPretTermineParDefaut, setPourcentageReserveHabitantPretTermineParDefaut] = useState(100)
  const [redevanceAcquisitivePretTermineParDefaut, setRedevanceAcquisitivePretTermineParDefaut] = useState(180)

  // Etat simulation
  const [sauvegardeLocalStorageImportee, setSauvegardeLocalStorageImportee] = useState(false)
  const [etatInitialHabitants, setEtatInitialHabitants] = useState([])
  const [simulationReserveHabitants, setSimulationReserveHabitants] = useState([])
  const [simulationHabitants, setSimulationHabitants] = useState({})
  const [montrerDetailsAnneeReserveHabitant, setMontrerDetailsAnneeReserveHabitant] = useState(null)
  const detailsAnneeReserveHabitant = montrerDetailsAnneeReserveHabitant ? simulationReserveHabitants[montrerDetailsAnneeReserveHabitant-1] : null

  // Simulate !
  useEffect(() => {

    // Init for simulation
    console.log('Simulation !!!')
    let habitants = JSON.parse(JSON.stringify(etatInitialHabitants))
    let sReserveHabitants = []
    let sHabitants = {}

    // Lancement de la simulation pour X années
    for(let annee = 1; annee <= dureeSimulation; annee+=1) {

      // Montant qui sera ajouter cette annee dans l'enveloppe habitant
      let montantAjouterCetteAnneeEnveloppeHabitant = 0
      let historiqueEnveloppeHabitant = []

      // Pour chaque habitant encore présent cette année là
      habitants.filter(habitant => habitant.anneeEntree <= annee && (habitant.anneeSortie === null || habitant.anneeSortie > annee))
        .forEach(habitant => {

          // Initialisation tableau pour cette habitant
          if(sHabitants[habitant.id] === undefined) {
            sHabitants[habitant.id] = []
          }

          // Simulation ajout montant en CCA
          habitant.anneeEntree = habitant.anneeEntree ? habitant.anneeEntree : 0
          let redevanceHabitant = annee - habitant.anneeEntree <= dureePret ? habitant.redevanceAcquisitivePretEnCours : habitant.redevanceAcquisitivePretTermine
          let pourcentageDonProjet = annee - habitant.anneeEntree <= dureePret ? habitant.pourcentageDonProjetPretEnCours : habitant.pourcentageDonProjetPretTermine
          let montantPreterCetteAnnee = redevanceHabitant * 12
          let montantAcquisCetteAnneeEnCCA = montantPreterCetteAnnee - (montantPreterCetteAnnee * pourcentageDonProjet / 100)
          let montantAnneePrecedenteCCA = habitant.cca
          sHabitants[habitant.id].push({
            annee: annee,
            difference: montantAcquisCetteAnneeEnCCA,
            cca: montantAnneePrecedenteCCA + montantAcquisCetteAnneeEnCCA
          })
          habitant.cca = montantAnneePrecedenteCCA + montantAcquisCetteAnneeEnCCA

          // Simulation ajout montant reserve habitant (une fois le prêt terminée, l'ensemble de la redevance acquisitive va à la réserve habitant)
          let pourcentageReserveHabitants = annee <= dureePret ? habitant.pourcentageReserveHabitantPretEnCours : habitant.pourcentageReserveHabitantPretTermine
          let montantAjouterCetteAnneeParCetHabitant = montantPreterCetteAnnee * pourcentageReserveHabitants / 100;
          montantAjouterCetteAnneeEnveloppeHabitant += montantAjouterCetteAnneeParCetHabitant
          historiqueEnveloppeHabitant.push({ nom: habitant.nom, difference: montantAjouterCetteAnneeParCetHabitant })

        })

      // Simulation etat enveloppe habitant après ajout de l'année
      let etatEnveloppeHabitantAnneePrecedente = sReserveHabitants.find(a => a.annee === annee-1)
      let montantEnveloppeHabitantAnneePrecedante = etatEnveloppeHabitantAnneePrecedente ? etatEnveloppeHabitantAnneePrecedente.montant : 0
      let montantEnveloppeHabitantApresAjoutAnnee = montantEnveloppeHabitantAnneePrecedante + montantAjouterCetteAnneeEnveloppeHabitant
      let montantRembourseCetteAnneeEnveloppeHabitant = 0

      // Liste des habitants en cours de sortie
      let habitantsEnCoursDeSortie = habitants.filter(habitant => habitant.anneeSortie !== null && habitant.anneeSortie <= annee && habitant.cca > 0)
      // Definition du reliquat de sortie pour les habitants sortants cette année
      habitantsEnCoursDeSortie.filter(habitant => habitant.anneeSortie === annee).forEach((habitant, index) => {

        // Reliquat l'année de sortie
        habitant.reliquatSortie = habitant.cca

        // Moins ce qu'apporte l'habitant remplaçant correspondant (dans l'ordre de la liste)
        const habitantsEntrantsCetteAnnee = habitants.filter(h => h.anneeEntree === annee)
        if(habitantsEntrantsCetteAnnee[index]) {
          const habitantEntrant = etatInitialHabitants.find(h => h.id === habitantsEntrantsCetteAnnee[index].id)
          habitant.reliquatSortie -= habitantEntrant.cca
          habitant.remboursementParHabitantEntrant = habitantEntrant.cca
        }

      })

      // Montant maximum redistribuer au sortant pour cette année
      let montantAnnuelRemboursementReserveHabitant = montantEnveloppeHabitantApresAjoutAnnee / 3
      let reliquatTotalSortants = habitantsEnCoursDeSortie.reduce((reliquatTotalSortants, habitant) => {
        return reliquatTotalSortants + habitant.reliquatSortie
      }, 0)

      // Pour chaque habitant en cours de sortie
      habitantsEnCoursDeSortie.forEach(habitant => {

        // Calcul part de l'enveloppe de remboursement pour cet habitant
        let pourcentageReliquatTotalSortantsAttribue = habitant.reliquatSortie * 100 / reliquatTotalSortants
        let montantRembourseCetteAnnee = montantAnnuelRemboursementReserveHabitant * pourcentageReliquatTotalSortantsAttribue / 100

        // Plafonnement maximum par an (remboursement en 3 an minimum)
        let montantMaximumRembourserParAnPourCetHabitant = Math.ceil(habitant.reliquatSortie / 3)
        montantRembourseCetteAnnee = montantRembourseCetteAnnee > montantMaximumRembourserParAnPourCetHabitant ? montantMaximumRembourserParAnPourCetHabitant : montantRembourseCetteAnnee

        // L'année de sortie, on rembourse le sortant avec l'apport de l'habitant entrant
        let montantRembourseApportEntrant = 0
        if(habitant.anneeSortie === annee && habitant.remboursementParHabitantEntrant) {
          montantRembourseApportEntrant = habitant.remboursementParHabitantEntrant
        }

        // Plafonnement à ce qui lui est du (on ne lui rembourse pas plus)
        let montantRestantARembourser = habitant.cca
        montantRembourseCetteAnnee = montantRestantARembourser - montantRembourseCetteAnnee < 0 ? montantRestantARembourser : montantRembourseCetteAnnee

        // Simulation pour cette année pour cet habitant sortant
        habitant.cca = montantRestantARembourser - montantRembourseCetteAnnee - montantRembourseApportEntrant
        sHabitants[habitant.id].push({
          annee: annee,
          difference: Math.ceil(-montantRembourseCetteAnnee -montantRembourseApportEntrant),
          cca: habitant.cca,
          sortie: true
        })
        montantRembourseCetteAnneeEnveloppeHabitant += montantRembourseCetteAnnee
        historiqueEnveloppeHabitant.push({ nom: habitant.nom, difference: Math.ceil(-montantRembourseCetteAnnee) })

        // On note le nombre d'année nécessaire pour rembourser cet habitant dans les lignes de sorties
        if(habitant.cca <= 0) {
          let nbAnneeRemboursementSortie = sHabitants[habitant.id].filter(h => h.sortie === true).length
          sHabitants[habitant.id] = sHabitants[habitant.id].map(historique => {
            if(historique.sortie === true) {
              historique.nbAnneeRemboursementSortie = nbAnneeRemboursementSortie
            }
            return historique
          })
        }

      })

      // Simulation reserve habitant
      let differenceReserveHabitantPourCetteAnnee = montantAjouterCetteAnneeEnveloppeHabitant - montantRembourseCetteAnneeEnveloppeHabitant
      sReserveHabitants.push({
        annee: annee,
        ajout: Math.ceil(montantAjouterCetteAnneeEnveloppeHabitant),
        remboursement: Math.ceil(montantRembourseCetteAnneeEnveloppeHabitant),
        difference: Math.ceil(differenceReserveHabitantPourCetteAnnee),
        montant: Math.ceil(montantEnveloppeHabitantAnneePrecedante + differenceReserveHabitantPourCetteAnnee),
        historique: historiqueEnveloppeHabitant
      })

    }

    // Keep simulation result in state
    setSimulationHabitants(sHabitants)
    setSimulationReserveHabitants(sReserveHabitants)

    // Log
    console.log(sReserveHabitants)
    console.log(sHabitants)

  }, [
    dureeSimulation,
    dureePret,
    etatInitialHabitants
  ])

  // Sauvegarde en local storage à chaque changement
  useEffect(() => {
    // Attente de la récupération depuis le local storage avant d'activer le système de sauvegarde
    if(sauvegardeLocalStorageImportee === false) {
      return
    }
    // Sauvegarde en local storage
    localStorage.setItem('sch-simulator-save', JSON.stringify({
      dureeSimulation: dureeSimulation,
      dureePret: dureePret,
      ccaInitialParDefaut: ccaInitialParDefaut,
      pourcentageDonProjetPretEnCoursParDefaut: pourcentageDonProjetPretEnCoursParDefaut,
      pourcentageReserveHabitantPretEnCoursParDefaut: pourcentageReserveHabitantPretEnCoursParDefaut,
      redevanceAcquisitivePretEnCoursParDefaut: redevanceAcquisitivePretEnCoursParDefaut,
      pourcentageDonProjetPretTermineParDefaut: pourcentageDonProjetPretTermineParDefaut,
      pourcentageReserveHabitantPretTermineParDefaut: pourcentageReserveHabitantPretTermineParDefaut,
      redevanceAcquisitivePretTermineParDefaut: redevanceAcquisitivePretTermineParDefaut,
      etatInitialHabitants: etatInitialHabitants
    }))
  }, [
    dureeSimulation,
    dureePret,
    ccaInitialParDefaut,
    pourcentageDonProjetPretEnCoursParDefaut,
    pourcentageReserveHabitantPretEnCoursParDefaut,
    redevanceAcquisitivePretEnCoursParDefaut,
    pourcentageDonProjetPretTermineParDefaut,
    pourcentageReserveHabitantPretTermineParDefaut,
    redevanceAcquisitivePretTermineParDefaut,
    etatInitialHabitants
  ])
  // Import depuis le local storage à chaque chargement du simulateur
  useEffect(() => {
    let saveFromLocalStorage = localStorage.getItem('sch-simulator-save')
    saveFromLocalStorage = saveFromLocalStorage ? JSON.parse(saveFromLocalStorage) : null
    _importFromObject(saveFromLocalStorage)
    setSauvegardeLocalStorageImportee(true)
  }, [])

  // Ajouter un nouvel habitant
  const _ajouterNouveauHabitant = () => {
    setEtatInitialHabitants(produce(etatInitialHabitants, d => {
      const newId = d[d.length-1] ? d[d.length-1].id + 1 : 1
      d.push({
        id: newId,
        nom: 'Habitant ' + newId,
        anneeEntree: 0,
        anneeSortie: null,
        cca: ccaInitialParDefaut,
        pourcentageDonProjetPretEnCours: pourcentageDonProjetPretEnCoursParDefaut,
        pourcentageReserveHabitantPretEnCours: pourcentageReserveHabitantPretEnCoursParDefaut,
        redevanceAcquisitivePretEnCours: redevanceAcquisitivePretEnCoursParDefaut,
        pourcentageDonProjetPretTermine: pourcentageDonProjetPretTermineParDefaut,
        pourcentageReserveHabitantPretTermine: pourcentageReserveHabitantPretTermineParDefaut,
        redevanceAcquisitivePretTermine: redevanceAcquisitivePretTermineParDefaut,
        reliquatSortie: null
      })
    }))
  }

  // Supprimer un habitant du simulateur
  const _supprimerHabitant = (habitantId) => {
    confirmAlert({
      title: 'Confirmation',
      message: 'Êtes vous sure de vouloir supprimer cet habitant du simulateur ?',
      buttons: [
        {
          label: 'Oui',
          onClick: () => {
            setEtatInitialHabitants(etatInitialHabitants.filter(habitant => habitant.id !== habitantId))
          }
        },
        {
          label: 'Annuler'
        }
      ]
    });
  }

  // Schéma de validation pour les configurations du simulateur
  const configurationSimulateurSchema = Yup.object().shape({
    dureeSimulation: Yup.number().min(1).required(),
    dureePret: Yup.number().min(1).required(),
    montrerDifference: Yup.boolean(),
    ccaInitialParDefaut: Yup.number().min(0).required(),
    pourcentageDonProjetPretEnCoursParDefaut: Yup.number().min(0).max(100).required(),
    pourcentageReserveHabitantPretEnCoursParDefaut: Yup.number().min(0).max(100).required(),
    redevanceAcquisitivePretEnCoursParDefaut: Yup.number().min(0).required(),
    pourcentageDonProjetPretTermineParDefaut: Yup.number().min(0).max(100).required(),
    pourcentageReserveHabitantPretTermineParDefaut: Yup.number().min(0).max(100).required(),
    redevanceAcquisitivePretTermineParDefaut: Yup.number().min(0).required()
  })

  // Schéma de validation pour les configurations d'un habitant'
  const configurationHabitantSchema = Yup.object().shape({
    nom: Yup.string().required(),
    anneeEntree: Yup.number().min(0).required(),
    anneeSortie: Yup.number().nullable().optional().min(1),
    cca: Yup.number().min(0).required(),
    pourcentageDonProjetPretEnCours: Yup.number().min(0).max(100).required(),
    pourcentageReserveHabitantPretEnCours: Yup.number().min(0).max(100).required(),
    redevanceAcquisitivePretEnCours: Yup.number().min(0).required(),
    pourcentageDonProjetPretTermine: Yup.number().min(0).max(100).required(),
    pourcentageReserveHabitantPretTermine: Yup.number().min(0).max(100).required(),
    redevanceAcquisitivePretTermine: Yup.number().min(0).required(),
  })

  // Export simulation to json
  const _exportSimulation = () => {

    // Save data as json
    let dataStr = JSON.stringify({
      dureeSimulation: dureeSimulation,
      dureePret: dureePret,
      ccaInitialParDefaut: ccaInitialParDefaut,
      pourcentageDonProjetPretEnCoursParDefaut: pourcentageDonProjetPretEnCoursParDefaut,
      pourcentageReserveHabitantPretEnCoursParDefaut: pourcentageReserveHabitantPretEnCoursParDefaut,
      redevanceAcquisitivePretEnCoursParDefaut: redevanceAcquisitivePretEnCoursParDefaut,
      pourcentageDonProjetPretTermineParDefaut: pourcentageDonProjetPretTermineParDefaut,
      pourcentageReserveHabitantPretTermineParDefaut: pourcentageReserveHabitantPretTermineParDefaut,
      redevanceAcquisitivePretTermineParDefaut: redevanceAcquisitivePretTermineParDefaut,
      etatInitialHabitants: etatInitialHabitants
    }, null, 4)

    // Download
    let dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    let exportFileDefaultName = 'sch-simulator-' + moment().format('DD-MM-YYYY-HH-mm') + '.json';
    let linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

  }

  // Import simulation from json
  const _importSimulation = (event) => {

    // Read from selected file
    const file = event.target.files[0]
    const reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = function (evt) {

      // Import config
      const importedFile = JSON.parse(evt.target.result)
      _importFromObject(importedFile)

    }
    reader.onerror = function (evt) {
      alert('Une erreur est survenue !')
    }
  }

  // Import configurations from js object (use both for import from json and from local storage)
  const _importFromObject = (data) => {
    if(!data) {
      return
    }
    if(data['dureeSimulation']) {
      setDureeSimulation(data['dureeSimulation'])
    }
    if(data['dureePret']) {
      setDureePret(data['dureePret'])
    }
    if(data['ccaInitialParDefaut']) {
      setCcaInitialParDefaut(data['ccaInitialParDefaut'])
    }
    if(data['pourcentageDonProjetPretEnCoursParDefaut']) {
      setPourcentageDonProjetPretEnCoursParDefaut(data['pourcentageDonProjetPretEnCoursParDefaut'])
    }
    if(data['pourcentageReserveHabitantPretEnCoursParDefaut']) {
      setPourcentageReserveHabitantPretEnCoursParDefaut(data['pourcentageReserveHabitantPretEnCoursParDefaut'])
    }
    if(data['redevanceAcquisitivePretEnCoursParDefaut']) {
      setRedevanceAcquisitivePretEnCoursParDefaut(data['redevanceAcquisitivePretEnCoursParDefaut'])
    }
    if(data['pourcentageDonProjetPretTermineParDefaut']) {
      setPourcentageDonProjetPretTermineParDefaut(data['pourcentageDonProjetPretTermineParDefaut'])
    }
    if(data['pourcentageReserveHabitantPretTermineParDefaut']) {
      setPourcentageReserveHabitantPretTermineParDefaut(data['pourcentageReserveHabitantPretTermineParDefaut'])
    }
    if(data['redevanceAcquisitivePretTermineParDefaut']) {
      setRedevanceAcquisitivePretTermineParDefaut(data['redevanceAcquisitivePretTermineParDefaut'])
    }
    if(data['etatInitialHabitants']) {
      setEtatInitialHabitants(data['etatInitialHabitants'])
    }
  }

  // Re-initialiser le simulateur
  const _resetSimulateur = () => {
    confirmAlert({
      title: 'Confirmation',
      message: 'Êtes vous sure de vouloir réinitialiser le simulateur ?',
      buttons: [
        {
          label: 'Oui',
          onClick: () => {
            localStorage.removeItem('sch-simulator-save')
            window.location.reload()
          }
        },
        {
          label: 'Annuler'
        }
      ]
    });
  }

  return (
    <div className="App">

      {/* Titre */}
      <h1>Simulateur d'évolution des créances Coopérative d'Habitant</h1>

      {/* Formulaire de configuration */}
      <Formik
        initialValues={{
          dureeSimulation: dureeSimulation,
          dureePret: dureePret,
          ccaInitialParDefaut: ccaInitialParDefaut,
          pourcentageDonProjetPretEnCoursParDefaut: pourcentageDonProjetPretEnCoursParDefaut,
          pourcentageReserveHabitantPretEnCoursParDefaut: pourcentageReserveHabitantPretEnCoursParDefaut,
          redevanceAcquisitivePretEnCoursParDefaut: redevanceAcquisitivePretEnCoursParDefaut,
          pourcentageDonProjetPretTermineParDefaut: pourcentageDonProjetPretTermineParDefaut,
          pourcentageReserveHabitantPretTermineParDefaut: pourcentageReserveHabitantPretTermineParDefaut,
          redevanceAcquisitivePretTermineParDefaut: redevanceAcquisitivePretTermineParDefaut
        }}
        enableReinitialize={true}
        validationSchema={configurationSimulateurSchema}
        onSubmit={values => {
          // Save config
          setDureeSimulation(values.dureeSimulation)
          setDureePret(values.dureePret)
          setCcaInitialParDefaut(values.ccaInitialParDefaut)
          setPourcentageDonProjetPretEnCoursParDefaut(values.pourcentageDonProjetPretEnCoursParDefaut)
          setPourcentageReserveHabitantPretEnCoursParDefaut(values.pourcentageReserveHabitantPretEnCoursParDefaut)
          setRedevanceAcquisitivePretEnCoursParDefaut(values.redevanceAcquisitivePretEnCoursParDefaut)
          setPourcentageDonProjetPretTermineParDefaut(values.pourcentageDonProjetPretTermineParDefaut)
          setPourcentageReserveHabitantPretTermineParDefaut(values.pourcentageReserveHabitantPretTermineParDefaut)
          setRedevanceAcquisitivePretTermineParDefaut(values.redevanceAcquisitivePretTermineParDefaut)
        }}
      >
        {({
          values,
          errors,
          touched,
          handleChange,
          handleSubmit
        }) => (
          <form onSubmit={handleSubmit}>

            {/* Configuration simulateur et actions */}
            <fieldset>
              <legend>Configuration simulateur et actions</legend>

              {/* Duree Simulation */}
              <div className={"form-group col-md-1"}>
                <label>Durée simulation (en année)</label>
                <input
                  className={(errors.dureeSimulation ? 'inputError' : '') + ' form-control'}
                  type="number"
                  name="dureeSimulation"
                  onChange={handleChange}
                  onBlur={handleSubmit}
                  value={values.dureeSimulation}
                />
              </div>

              {/* Duree Prêt */}
              <div className={"form-group col-md-1"}>
                <label>Durée prêt et durée prix de revient (en année)</label>
                <input
                  className={(errors.dureeSimulation ? 'inputError' : '') + ' form-control'}
                  type="number"
                  name="dureeSimulation"
                  onChange={handleChange}
                  onBlur={handleSubmit}
                  value={values.dureePret}
                />
              </div>

              {/* Ajout habitant */}
              <div className={"form-group col-md-1"}>
                <button type="button" onClick={_ajouterNouveauHabitant}>
                  Ajouter un habitant
                </button>
              </div>

              {/* Export simulation */}
              <div className={"form-group col-md-1"}>
                <button type="button" onClick={_exportSimulation}>
                  Sauvegarder simulation
                </button>
              </div>

              {/* Import simulation */}
              <div className={"form-group col-md-1"}>
                <button type="button" onClick={() => hiddenFileImportInputRef.current.click() }>
                  Restaurer une simulation
                </button>
                <input
                  style={{display: 'none'}}
                  ref={hiddenFileImportInputRef}
                  type={'file'}
                  onChange={_importSimulation}
                />
              </div>

              {/* Re-initialiser le simulateur */}
              <div className={"form-group col-md-1"}>
                <button type="button" onClick={_resetSimulateur}>
                  Re-initialiser le simulateur
                </button>
              </div>

            </fieldset>

            {/* Configuration simulateur et actions */}
            <fieldset>
              <legend>Valeurs par défaut quand ajout d'habitant</legend>

              {/* CCA Initial */}
              <div className={"form-group col-md-1"}>
                <label className={'labelInputDefaultValueHabitant'}>Compte-Courant d'Associé (CCA) Initial</label>
                <input
                  className={(errors.ccaInitialParDefaut ? 'inputError' : '') + ' form-control'}
                  type="number"
                  name="ccaInitialParDefaut"
                  onChange={handleChange}
                  onBlur={handleSubmit}
                  value={values.ccaInitialParDefaut}
                />
              </div>

              {/* Pourcentage don au projet prix de revient (PDR) non atteint */}
              <div className={"form-group col-md-1"}>
                <label className={'labelInputDefaultValueHabitant'}>Pourcentage don au projet prix de revient (PDR) non atteint</label>
                <input
                  className={(errors.pourcentageDonProjetPretEnCoursParDefaut ? 'inputError' : '') + ' form-control'}
                  type="number"
                  name="pourcentageDonProjetPretEnCoursParDefaut"
                  onChange={handleChange}
                  onBlur={handleSubmit}
                  value={values.pourcentageDonProjetPretEnCoursParDefaut}
                />
              </div>

              {/* Pourcentage réserve habitant prix de revient (PDR) non atteint */}
              <div className={"form-group col-md-1"}>
                <label className={'labelInputDefaultValueHabitant'}>Pourcentage réserve habitant prix de revient (PDR) non atteint</label>
                <input
                  className={(errors.pourcentageReserveHabitantPretEnCoursParDefaut ? 'inputError' : '') + ' form-control'}
                  type="number"
                  name="pourcentageReserveHabitantPretEnCoursParDefaut"
                  onChange={handleChange}
                  onBlur={handleSubmit}
                  value={values.pourcentageReserveHabitantPretEnCoursParDefaut}
                />
              </div>

              {/* Redevance acquisitive prix de revient (PDR) non atteint */}
              <div className={"form-group col-md-1"}>
                <label className={'labelInputDefaultValueHabitant'}>Redevance acquisitive prix de revient (PDR) non atteint</label>
                <input
                  className={(errors.redevanceAcquisitivePretEnCoursParDefaut ? 'inputError' : '') + ' form-control'}
                  type="number"
                  name="redevanceAcquisitivePretEnCoursParDefaut"
                  onChange={handleChange}
                  onBlur={handleSubmit}
                  value={values.redevanceAcquisitivePretEnCoursParDefaut}
                />
              </div>

              {/* Pourcentage don au projet prix de revient (PDR) atteint */}
              <div className={"form-group col-md-1"}>
                <label className={'labelInputDefaultValueHabitant'}>Pourcentage don au projet prix de revient (PDR) atteint</label>
                <input
                  className={(errors.pourcentageDonProjetPretTermineParDefaut ? 'inputError' : '') + ' form-control'}
                  type="number"
                  name="pourcentageDonProjetPretTermineParDefaut"
                  onChange={handleChange}
                  onBlur={handleSubmit}
                  value={values.pourcentageDonProjetPretTermineParDefaut}
                />
              </div>

              {/* Pourcentage réserve habitant prêt terminé */}
              {/*
                  Est-ce qu'il existe des cas où après avoir remboursé le pret, ce n'est pas 100% de la redevance acquisitive
                  qui va dans la réserve départs habitants ?
                  Pour le moment je cache de l'affichage, la valeur reste donc 100% dans tout les cas (valeur par défaut)
              */}
              {/*<div className={"form-group col-md-1"}>
                <label className={'labelInputDefaultValueHabitant'}>Pourcentage réserve habitant prêt terminé</label>
                <input
                  className={(errors.pourcentageReserveHabitantPretTermineParDefaut ? 'inputError' : '') + ' form-control'}
                  type="number"
                  name="pourcentageReserveHabitantPretTermineParDefaut"
                  onChange={handleChange}
                  onBlur={handleSubmit}
                  value={values.pourcentageReserveHabitantPretTermineParDefaut}
                />
              </div>*/}

              {/* Redevance acquisitive prix de revient (PDR) atteint */}
              <div className={"form-group col-md-1"}>
                <label className={'labelInputDefaultValueHabitant'}>Redevance acquisitive prix de revient (PDR) atteint</label>
                <input
                  className={(errors.redevanceAcquisitivePretTermineParDefaut ? 'inputError' : '') + ' form-control'}
                  type="number"
                  name="redevanceAcquisitivePretTermineParDefaut"
                  onChange={handleChange}
                  onBlur={handleSubmit}
                  value={values.redevanceAcquisitivePretTermineParDefaut}
                />
              </div>

            </fieldset>

          </form>
        )}
      </Formik>

      {/* Liste des habitants et de la réserve habitant */}
      <table className={'table'}>

        {/* Entetes tableau */}
        <thead>
          <tr>
            <th colSpan={11}> </th>
            {simulationReserveHabitants.map(simulationAnnee => (
              <th key={simulationAnnee.annee} className={'yearColumn'}>Année {simulationAnnee.annee}</th>
            ))}
          </tr>
          <tr>
            <th> </th>
            <th>Nom</th>
            <th>Année entrée</th>
            <th>Année sortie</th>
            <th>CCA Initial</th>
            <th>% don au projet PDR non atteint</th>
            <th>% reserve habitants PDR non atteint</th>
            <th>Redevance acquisitive PDR non atteint</th>
            <th>% don au projet PDR atteint</th>
            {/*<th>% reserve habitants prêt terminé</th>*/}
            <th>Redevance acquisitive PDR atteint</th>
            {simulationReserveHabitants.map(simulationAnnee => (
              <th key={simulationAnnee.annee}>Montant</th>
            ))}
          </tr>
        </thead>

        {/* Table body */}
        <tbody>

          {/* Evolution enveloppe habitant */}
          <tr>
            <th colSpan={3} className={'stickyColumn firstColumn'}>Réserve départs habitants</th>
            <th colSpan={8}> </th>
            {simulationReserveHabitants.map(simulationAnnee => (
              <td
                key={simulationAnnee.annee}
                className={'clickable'}
                onClick={() => setMontrerDetailsAnneeReserveHabitant(simulationAnnee.annee)}
              >
                {Math.ceil(simulationAnnee.montant)}
              </td>
            ))}
          </tr>

          {/* Edition config habitant et evolution CCA habitants */}
          {etatInitialHabitants.map(habitant => (
            <Formik
              key={habitant.id}
              initialValues={habitant}
              validationSchema={configurationHabitantSchema}
              onSubmit={habitantModifier => {
                setEtatInitialHabitants(produce(etatInitialHabitants, draft => {
                  let habitantIndex = etatInitialHabitants.findIndex(habitant => habitant.id === habitantModifier.id)
                  draft[habitantIndex] = habitantModifier
                }))
              }}
            >
              {({
                values,
                errors,
                touched,
                handleChange,
                handleSubmit
              }) => (
                <tr>
                  <th>
                    <div className={'actionColumn'}>
                      <i
                        className="bi bi-trash deleteHabitantIcon"
                        onClick={() => _supprimerHabitant(habitant.id)}
                      > </i>
                    </div>
                  </th>
                  <th className={'stickyColumn firstColumn'}>
                    <input
                      className={(errors.nom ? 'inputError' : '') + ' form-control tableInlineInput tableInlineInputNom'}
                      type={'string'}
                      value={values.nom}
                      name={'nom'}
                      onChange={handleChange}
                      onBlur={handleSubmit}
                    />
                  </th>
                  <th>
                    <input
                      className={(errors.anneeEntree ? 'inputError' : '') + ' form-control tableInlineInput'}
                      type={'number'}
                      value={values.anneeEntree}
                      name={'anneeEntree'}
                      onChange={handleChange}
                      onBlur={handleSubmit}
                    />
                  </th>
                  <th>
                    <input
                      className={(errors.anneeSortie ? 'inputError' : '') + ' form-control tableInlineInput'}
                      type={'number'}
                      value={values.anneeSortie}
                      name={'anneeSortie'}
                      onChange={handleChange}
                      onBlur={handleSubmit}
                    />
                    {errors.anneeSortie}
                  </th>
                  <th>
                    <input
                      className={(errors.cca ? 'inputError' : '') + ' form-control tableInlineInput'}
                      type={'number'}
                      value={values.cca}
                      name={'cca'}
                      onChange={handleChange}
                      onBlur={handleSubmit}
                    />
                  </th>
                  <th>
                    <input
                      className={(errors.pourcentageDonProjetPretEnCours ? 'inputError' : '') + ' form-control tableInlineInput'}
                      type={'number'}
                      value={values.pourcentageDonProjetPretEnCours}
                      name={'pourcentageDonProjetPretEnCours'}
                      onChange={handleChange}
                      onBlur={handleSubmit}
                    />
                  </th>
                  <th>
                    <input
                      className={(errors.pourcentageReserveHabitantPretEnCours ? 'inputError' : '') + ' form-control tableInlineInput'}
                      type={'number'}
                      value={values.pourcentageReserveHabitantPretEnCours}
                      name={'pourcentageReserveHabitantPretEnCours'}
                      onChange={handleChange}
                      onBlur={handleSubmit}
                    />
                  </th>
                  <th>
                    <input
                      className={(errors.redevanceAcquisitivePretEnCours ? 'inputError' : '') + ' form-control tableInlineInput'}
                      type={'number'}
                      value={values.redevanceAcquisitivePretEnCours}
                      name={'redevanceAcquisitivePretEnCours'}
                      onChange={handleChange}
                      onBlur={handleSubmit}
                    />
                  </th>
                  <th>
                    <input
                      className={(errors.pourcentageDonProjetPretTermine ? 'inputError' : '') + ' form-control tableInlineInput'}
                      type={'number'}
                      value={values.pourcentageDonProjetPretTermine}
                      name={'pourcentageDonProjetPretTermine'}
                      onChange={handleChange}
                      onBlur={handleSubmit}
                    />
                  </th>
                  {/*<th>
                    <input
                      className={(errors.pourcentageReserveHabitantPretTermine ? 'inputError' : '') + ' form-control tableInlineInput'}
                      type={'number'}
                      value={values.pourcentageReserveHabitantPretTermine}
                      name={'pourcentageReserveHabitantPretTermine'}
                      onChange={handleChange}
                      onBlur={handleSubmit}
                    />
                  </th>*/}
                  <th>
                    <input
                      className={(errors.redevanceAcquisitivePretTermine ? 'inputError' : '') + ' form-control tableInlineInput'}
                      type={'number'}
                      value={values.redevanceAcquisitivePretTermine}
                      name={'redevanceAcquisitivePretTermine'}
                      onChange={handleChange}
                      onBlur={handleSubmit}
                    />
                  </th>
                  {simulationReserveHabitants.map(simulationAnnee => {
                    let simulationHabitant = simulationHabitants[habitant.id] && simulationHabitants[habitant.id].find(simulationAnneeHabitant => simulationAnneeHabitant.annee === simulationAnnee.annee)
                    if(simulationHabitant === undefined) {
                      return <td key={simulationAnnee.annee}> </td>
                    }
                    return (
                      <td
                        key={simulationAnnee.annee}
                        style={simulationHabitant.sortie && { color: 'green' }}
                        title={
                          'Différence : ' + (simulationHabitant.difference > 0 ? '+' : '') + simulationHabitant.difference + ' €'
                          + (simulationHabitant.nbAnneeRemboursementSortie ? ' | Temps de remboursement : ' + simulationHabitant.nbAnneeRemboursementSortie + ' ans' : '')
                        }
                      >
                        {Math.ceil(simulationHabitant.cca)}
                      </td>
                    )
                  })}
                </tr>
              )}
            </Formik>
          ))}

        </tbody>

      </table>

      {/* Modal de détail pour une année de l'évolution de la réserve habitant */}
      {detailsAnneeReserveHabitant && (
        <div className={'blackBackground'}>
          <div className="modalShow modal" tabIndex="-1" role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Détail réserve départs habitants année {detailsAnneeReserveHabitant.annee}</h5>
                </div>
                <div className="modal-body modalEnveloppeHabitant">
                  <table>
                    <tr><th>Année : </th><td className={'enveloppeHabitantRow'}>{detailsAnneeReserveHabitant.annee}</td></tr>
                    <tr><th>Ajout : </th><td className={'enveloppeHabitantRow'}>{detailsAnneeReserveHabitant.ajout} €</td></tr>
                    <tr><th>Remboursement : </th><td className={'enveloppeHabitantRow'}>{detailsAnneeReserveHabitant.remboursement} €</td></tr>
                    <tr><th>Différence : </th><td className={'enveloppeHabitantRow'}>{detailsAnneeReserveHabitant.difference} €</td></tr>
                    <tr><th>Montant à la fin d'année : </th><td className={'enveloppeHabitantRow'}>{detailsAnneeReserveHabitant.montant} €</td></tr>
                  </table>
                  <div className={'bold'}>Historique : </div>
                  <ul>
                    {detailsAnneeReserveHabitant.historique.map(historique => (
                      <li>{historique.nom} : {(historique.difference > 0 ? '+' : '') + historique.difference + ' €'}</li>
                    ))}
                  </ul>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setMontrerDetailsAnneeReserveHabitant(null)}
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
