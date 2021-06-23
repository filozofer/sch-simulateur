import './App.css';
import React, { useEffect } from 'react'
import { useState } from 'react'
import { Formik } from 'formik'
import * as Yup from 'yup'
import produce from 'immer'
import moment from 'moment'

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
  const [etatInitialHabitants, setEtatInitialHabitants] = useState([])
  let [simulationReserveHabitants, setSimulationReserveHabitants] = useState([])
  let [simulationHabitants, setSimulationHabitants] = useState({})

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

          // Simulation ajout montant reserve habitant
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
          difference: -montantRembourseCetteAnnee -montantRembourseApportEntrant,
          cca: habitant.cca,
          sortie: true
        })
        montantRembourseCetteAnneeEnveloppeHabitant += montantRembourseCetteAnnee
        historiqueEnveloppeHabitant.push({ nom: habitant.nom, difference: -montantRembourseCetteAnnee })

      })

      // Simulation reserve habitant
      let differenceReserveHabitantPourCetteAnnee = montantAjouterCetteAnneeEnveloppeHabitant - montantRembourseCetteAnneeEnveloppeHabitant
      sReserveHabitants.push({
        annee: annee,
        ajout: montantAjouterCetteAnneeEnveloppeHabitant,
        remboursement: montantRembourseCetteAnneeEnveloppeHabitant,
        difference: differenceReserveHabitantPourCetteAnnee,
        montant: montantEnveloppeHabitantAnneePrecedante + differenceReserveHabitantPourCetteAnnee,
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

  // Schéma de validation pour les configurations du simulateur
  const configurationSchema = Yup.object().shape({
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
      if(importedFile['dureeSimulation']) {
        setDureeSimulation(importedFile['dureeSimulation'])
      }
      if(importedFile['dureePret']) {
        setDureePret(importedFile['dureePret'])
      }
      if(importedFile['ccaInitialParDefaut']) {
        setCcaInitialParDefaut(importedFile['ccaInitialParDefaut'])
      }
      if(importedFile['pourcentageDonProjetPretEnCoursParDefaut']) {
        setPourcentageDonProjetPretEnCoursParDefaut(importedFile['pourcentageDonProjetPretEnCoursParDefaut'])
      }
      if(importedFile['pourcentageReserveHabitantPretEnCoursParDefaut']) {
        setPourcentageReserveHabitantPretEnCoursParDefaut(importedFile['pourcentageReserveHabitantPretEnCoursParDefaut'])
      }
      if(importedFile['redevanceAcquisitivePretEnCoursParDefaut']) {
        setRedevanceAcquisitivePretEnCoursParDefaut(importedFile['redevanceAcquisitivePretEnCoursParDefaut'])
      }
      if(importedFile['pourcentageDonProjetPretTermineParDefaut']) {
        setPourcentageDonProjetPretTermineParDefaut(importedFile['pourcentageDonProjetPretTermineParDefaut'])
      }
      if(importedFile['pourcentageReserveHabitantPretTermineParDefaut']) {
        setPourcentageReserveHabitantPretTermineParDefaut(importedFile['pourcentageReserveHabitantPretTermineParDefaut'])
      }
      if(importedFile['redevanceAcquisitivePretTermineParDefaut']) {
        setRedevanceAcquisitivePretTermineParDefaut(importedFile['redevanceAcquisitivePretTermineParDefaut'])
      }
      if(importedFile['etatInitialHabitants']) {
        setEtatInitialHabitants(importedFile['etatInitialHabitants'])
      }

    }
    reader.onerror = function (evt) {
      alert('Une erreur est survenue !')
    }
  }

  return (
    <div className="App">

      {/* Title */}
      <h1>Simulateur d'évolution des créances Coopérative d'Habitant</h1>

      {/* Config form */}
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
        validationSchema={configurationSchema}
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
                  className={'form-control'}
                  type="number"
                  name="dureeSimulation"
                  onChange={handleChange}
                  onBlur={handleSubmit}
                  value={values.dureeSimulation}
                />
                {errors.dureeSimulation && touched.dureeSimulation && errors.dureeSimulation}
              </div>

              {/* Duree Prêt */}
              <div className={"form-group col-md-1"}>
                <label>Durée prêt (en année)</label>
                <input
                  className={'form-control'}
                  type="number"
                  name="dureeSimulation"
                  onChange={handleChange}
                  onBlur={handleSubmit}
                  value={values.dureePret}
                />
                {errors.dureePret && touched.dureePret && errors.dureePret}
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
                  Exporter simulation
                </button>
              </div>

              {/* Import simulation */}
              <div className={"form-group col-md-1"}>
                <button type="button" onClick={() => hiddenFileImportInputRef.current.click() }>
                  Importer simulation
                </button>
                <input
                  style={{display: 'none'}}
                  ref={hiddenFileImportInputRef}
                  type={'file'}
                  onChange={_importSimulation}
                />
              </div>

            </fieldset>

            {/* Configuration simulateur et actions */}
            <fieldset>
              <legend>Valeurs par défaut quand ajout d'habitant</legend>

              {/* CCA Initial */}
              <div className={"form-group col-md-1"}>
                <label className={'labelInputDefaultValueHabitant'}>CCA Initial</label>
                <input
                  className={'form-control'}
                  type="number"
                  name="ccaInitialParDefaut"
                  onChange={handleChange}
                  onBlur={handleSubmit}
                  value={values.ccaInitialParDefaut}
                />
                {errors.ccaInitialParDefaut && touched.ccaInitialParDefaut && errors.ccaInitialParDefaut}
              </div>

              {/* Pourcentage don au projet prêt en cours */}
              <div className={"form-group col-md-1"}>
                <label className={'labelInputDefaultValueHabitant'}>Pourcentage don au projet prêt en cours</label>
                <input
                  className={'form-control'}
                  type="number"
                  name="pourcentageDonProjetPretEnCoursParDefaut"
                  onChange={handleChange}
                  onBlur={handleSubmit}
                  value={values.pourcentageDonProjetPretEnCoursParDefaut}
                />
                {errors.pourcentageDonProjetPretEnCoursParDefaut && touched.pourcentageDonProjetPretEnCoursParDefaut && errors.pourcentageDonProjetPretEnCoursParDefaut}
              </div>

              {/* Pourcentage réserve habitant prêt en cours */}
              <div className={"form-group col-md-1"}>
                <label className={'labelInputDefaultValueHabitant'}>Pourcentage réserve habitant prêt en cours</label>
                <input
                  className={'form-control'}
                  type="number"
                  name="pourcentageReserveHabitantPretEnCoursParDefaut"
                  onChange={handleChange}
                  onBlur={handleSubmit}
                  value={values.pourcentageReserveHabitantPretEnCoursParDefaut}
                />
                {errors.pourcentageReserveHabitantPretEnCoursParDefaut && touched.pourcentageReserveHabitantPretEnCoursParDefaut && errors.pourcentageReserveHabitantPretEnCoursParDefaut}
              </div>

              {/* Redevance acquisitive prêt en cours */}
              <div className={"form-group col-md-1"}>
                <label className={'labelInputDefaultValueHabitant'}>Redevance acquisitive prêt en cours</label>
                <input
                  className={'form-control'}
                  type="number"
                  name="redevanceAcquisitivePretEnCoursParDefaut"
                  onChange={handleChange}
                  onBlur={handleSubmit}
                  value={values.redevanceAcquisitivePretEnCoursParDefaut}
                />
                {errors.redevanceAcquisitivePretEnCoursParDefaut && touched.redevanceAcquisitivePretEnCoursParDefaut && errors.redevanceAcquisitivePretEnCoursParDefaut}
              </div>

              {/* Pourcentage don au projet prêt terminé */}
              <div className={"form-group col-md-1"}>
                <label className={'labelInputDefaultValueHabitant'}>Pourcentage don au projet prêt terminé</label>
                <input
                  className={'form-control'}
                  type="number"
                  name="pourcentageDonProjetPretTermineParDefaut"
                  onChange={handleChange}
                  onBlur={handleSubmit}
                  value={values.pourcentageDonProjetPretTermineParDefaut}
                />
                {errors.pourcentageDonProjetPretTermineParDefaut && touched.pourcentageDonProjetPretTermineParDefaut && errors.pourcentageDonProjetPretTermineParDefaut}
              </div>

              {/* Pourcentage réserve habitant prêt terminé */}
              <div className={"form-group col-md-1"}>
                <label className={'labelInputDefaultValueHabitant'}>Pourcentage réserve habitant prêt terminé</label>
                <input
                  className={'form-control'}
                  type="number"
                  name="pourcentageReserveHabitantPretTermineParDefaut"
                  onChange={handleChange}
                  onBlur={handleSubmit}
                  value={values.pourcentageReserveHabitantPretTermineParDefaut}
                />
                {errors.pourcentageReserveHabitantPretTermineParDefaut && touched.pourcentageReserveHabitantPretTermineParDefaut && errors.pourcentageReserveHabitantPretTermineParDefaut}
              </div>

              {/* Redevance acquisitive prêt terminé */}
              <div className={"form-group col-md-1"}>
                <label className={'labelInputDefaultValueHabitant'}>Redevance acquisitive prêt terminé</label>
                <input
                  className={'form-control'}
                  type="number"
                  name="redevanceAcquisitivePretTermineParDefaut"
                  onChange={handleChange}
                  onBlur={handleSubmit}
                  value={values.redevanceAcquisitivePretTermineParDefaut}
                />
                {errors.redevanceAcquisitivePretTermineParDefaut && touched.redevanceAcquisitivePretTermineParDefaut && errors.redevanceAcquisitivePretTermineParDefaut}
              </div>

            </fieldset>

          </form>
        )}
      </Formik>

      <table className={'table'}>

        {/* Entetes tableau */}
        <thead>
          <tr>
            <th colSpan={11}> </th>
            {simulationReserveHabitants.map(simulationAnnee => (
              <th key={simulationAnnee.annee}>Année {simulationAnnee.annee}</th>
            ))}
          </tr>
          <tr>
            <th> </th>
            <th>Nom</th>
            <th>Année entrée</th>
            <th>Année sortie</th>
            <th>CCA Initial</th>
            <th>% don au projet durée prêt</th>
            <th>% reserve habitants prêt en cours</th>
            <th>Redevance acquisitive durée prêt</th>
            <th>% don au projet durée prêt</th>
            <th>% reserve habitants prêt terminé</th>
            <th>Redevance acquisitive durée prêt</th>
            {simulationReserveHabitants.map(simulationAnnee => (
              <th key={simulationAnnee.annee}>Montant</th>
            ))}
          </tr>
        </thead>

        {/* Table body */}
        <tbody>

          {/* Evolution enveloppe habitant */}
          <tr>
            <th colSpan={2} className={'stickyColumn firstColumn'}>Enveloppe habitant</th>
            <th colSpan={9}> </th>
            {simulationReserveHabitants.map(simulationAnnee => (
              <td key={simulationAnnee.annee}>
                {Math.ceil(simulationAnnee.montant)}
              </td>
            ))}
          </tr>

          {/* Edition config habitant et evolution CCA habitants */}
          {etatInitialHabitants.map(habitant => (
            <Formik
              key={habitant.id}
              initialValues={habitant}
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
                  <th>{habitant.id}</th>
                  <th className={'stickyColumn firstColumn'}>
                    <input
                      className={'form-control tableInlineInput tableInlineInputNom'}
                      type={'string'}
                      value={values.nom}
                      name={'nom'}
                      onChange={handleChange}
                      onBlur={handleSubmit}
                    />
                  </th>
                  <th>
                    <input
                      className={'form-control tableInlineInput'}
                      type={'number'}
                      value={values.anneeEntree}
                      name={'anneeEntree'}
                      onChange={handleChange}
                      onBlur={handleSubmit}
                    />
                  </th>
                  <th>
                    <input
                      className={'form-control tableInlineInput'}
                      type={'number'}
                      value={values.anneeSortie}
                      name={'anneeSortie'}
                      onChange={handleChange}
                      onBlur={handleSubmit}
                    />
                  </th>
                  <th>
                    <input
                      className={'form-control tableInlineInput'}
                      type={'number'}
                      value={values.cca}
                      name={'cca'}
                      onChange={handleChange}
                      onBlur={handleSubmit}
                    />
                  </th>
                  <th>
                    <input
                      className={'form-control tableInlineInput'}
                      type={'number'}
                      value={values.pourcentageDonProjetPretEnCours}
                      name={'pourcentageDonProjetPretEnCours'}
                      onChange={handleChange}
                      onBlur={handleSubmit}
                    />
                  </th>
                  <th>
                    <input
                      className={'form-control tableInlineInput'}
                      type={'number'}
                      value={values.pourcentageReserveHabitantPretEnCours}
                      name={'pourcentageReserveHabitantPretEnCours'}
                      onChange={handleChange}
                      onBlur={handleSubmit}
                    />
                  </th>
                  <th>
                    <input
                      className={'form-control tableInlineInput'}
                      type={'number'}
                      value={values.redevanceAcquisitivePretEnCours}
                      name={'redevanceAcquisitivePretEnCours'}
                      onChange={handleChange}
                      onBlur={handleSubmit}
                    />
                  </th>
                  <th>
                    <input
                      className={'form-control tableInlineInput'}
                      type={'number'}
                      value={values.pourcentageDonProjetPretTermine}
                      name={'pourcentageDonProjetPretTermine'}
                      onChange={handleChange}
                      onBlur={handleSubmit}
                    />
                  </th>
                  <th>
                    <input
                      className={'form-control tableInlineInput'}
                      type={'number'}
                      value={values.pourcentageReserveHabitantPretTermine}
                      name={'pourcentageReserveHabitantPretTermine'}
                      onChange={handleChange}
                      onBlur={handleSubmit}
                    />
                  </th>
                  <th>
                    <input
                      className={'form-control tableInlineInput'}
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
    </div>
  );
}

export default App;
