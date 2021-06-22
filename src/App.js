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

  // Variable d'ajustement
  const [montantParDefautRedevance, setMontantParDefautRedevance] = useState(700)
  const [dureeSimulation, setDureeSimulation] = useState(20)
  const [pourcentageReserveHabitants, setPourcentageReserveHabitants] = useState(20)
  const [pourcentagePartAcquisitive, setPourcentagePartAcquisitive] = useState(100)

  // Variable UI
  const [montrerDifference, setMontrerDifference] = useState(false)

  // Etat simulation
  const [etatInitialHabitants, setEtatInitialHabitants] = useState([
    /*{ id: 1, nom: 'Maxime', redevance: montantParDefautRedevance, cca: 0, anneeEntree: 0, anneeSortie: null, reliquatSortie: null },
    { id: 2, nom: 'Stéphanie', redevance: montantParDefautRedevance, cca: 0, anneeEntree: 0, anneeSortie: null, reliquatSortie: null },
    { id: 3, nom: 'Régis', redevance: montantParDefautRedevance, cca: 0, anneeEntree: 0, anneeSortie: 5, reliquatSortie: null },
    { id: 4, nom: 'Nicole', redevance: montantParDefautRedevance, cca: 0, anneeEntree: 0, anneeSortie: 7, reliquatSortie: null },
    { id: 5, nom: 'Gaetan', redevance: montantParDefautRedevance, cca: 0, anneeEntree: 0, anneeSortie: 5, reliquatSortie: null },
    { id: 6, nom: 'Blandine', redevance: montantParDefautRedevance, cca: 0, anneeEntree: 0, anneeSortie: null, reliquatSortie: null },
    { id: 7, nom: 'Benoit', redevance: montantParDefautRedevance, cca: 0, anneeEntree: 0, anneeSortie: null, reliquatSortie: null },
    { id: 8, nom: 'François', redevance: montantParDefautRedevance, cca: 0, anneeEntree: 5, anneeSortie: null, reliquatSortie: null },
    { id: 9, nom: 'Julie', redevance: montantParDefautRedevance, cca: 0, anneeEntree: 7, anneeSortie: null, reliquatSortie: null },
    { id: 10, nom: 'Romain', redevance: montantParDefautRedevance, cca: 0, anneeEntree: 5, anneeSortie: null, reliquatSortie: null },*/
  ])
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
          let montantPreterCetteAnnee = habitant.redevance * 12 * pourcentagePartAcquisitive / 100
          let montantAnneePrecedenteCCA = habitant.cca
          sHabitants[habitant.id].push({
            annee: annee,
            difference: montantPreterCetteAnnee,
            cca: montantAnneePrecedenteCCA + montantPreterCetteAnnee
          })
          habitant.cca = montantAnneePrecedenteCCA + montantPreterCetteAnnee

          // Simulation ajout montant reserve habitant
          montantAjouterCetteAnneeEnveloppeHabitant += habitant.redevance * 12 * pourcentageReserveHabitants / 100
          historiqueEnveloppeHabitant.push({ nom: habitant.nom, difference: montantAjouterCetteAnneeEnveloppeHabitant })

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
        difference: differenceReserveHabitantPourCetteAnnee,
        montant: montantEnveloppeHabitantAnneePrecedante + differenceReserveHabitantPourCetteAnnee,
        historique: historiqueEnveloppeHabitant
      })

    }

    // Keep simulation result in state
    setSimulationHabitants(sHabitants)
    setSimulationReserveHabitants(sReserveHabitants)

  }, [
    dureeSimulation,
    pourcentageReserveHabitants,
    pourcentagePartAcquisitive,
    etatInitialHabitants
  ])

  // Ajouter un nouvel habitant
  const _ajouterNouveauHabitant = () => {
    setEtatInitialHabitants(produce(etatInitialHabitants, d => {
      const newId = d[d.length-1] ? d[d.length-1].id + 1 : 1
      d.push({
        id: newId,
        nom: 'Habitant ' + newId,
        redevance: montantParDefautRedevance,
        cca: 0,
        anneeEntree: 0,
        anneeSortie: null,
        reliquatSortie: null
      })
    }))
  }

  // Form validation schema
  const configurationSchema = Yup.object().shape({
    montantParDefautRedevance: Yup.number().min(0).required(),
    pourcentageReserveHabitants: Yup.number().min(1).max(100).required(),
    pourcentagePartAcquisitive: Yup.number().min(1).max(100).required(),
    dureeSimulation: Yup.number().min(1).required(),
    montrerDifference: Yup.boolean()
  })

  // Export simulation to json
  const _exportSimulation = () => {

    // Save data as json
    let dataStr = JSON.stringify({
      montantParDefautRedevance: montantParDefautRedevance,
      dureeSimulation: dureeSimulation,
      pourcentageReserveHabitants: pourcentageReserveHabitants,
      pourcentagePartAcquisitive: pourcentagePartAcquisitive,
      montrerDifference: montrerDifference,
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
      if(importedFile['montantParDefautRedevance']) {
        setMontantParDefautRedevance(importedFile['montantParDefautRedevance'])
      }
      if(importedFile['dureeSimulation']) {
        setDureeSimulation(importedFile['dureeSimulation'])
      }
      if(importedFile['pourcentageReserveHabitants']) {
        setPourcentageReserveHabitants(importedFile['pourcentageReserveHabitants'])
      }
      if(importedFile['pourcentagePartAcquisitive']) {
        setPourcentagePartAcquisitive(importedFile['pourcentagePartAcquisitive'])
      }
      if(importedFile['montrerDifference']) {
        setMontrerDifference(importedFile['montrerDifference'])
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
          montantParDefautRedevance: montantParDefautRedevance,
          pourcentageReserveHabitants: pourcentageReserveHabitants,
          pourcentagePartAcquisitive: pourcentagePartAcquisitive,
          dureeSimulation: dureeSimulation,
          montrerDifference: montrerDifference
        }}
        enableReinitialize={true}
        validationSchema={configurationSchema}
        onSubmit={values => {
          // Save config
          setMontantParDefautRedevance(values.montantParDefautRedevance)
          setPourcentageReserveHabitants(values.pourcentageReserveHabitants)
          setPourcentagePartAcquisitive(values.pourcentagePartAcquisitive)
          setDureeSimulation(values.dureeSimulation)
          setMontrerDifference(values.montrerDifference)
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

            {/* Montant Par Defaut Redevance Acquisitive */}
            <div className={"form-group col-md-2"}>
              <label>Montant par défaut redevance</label>
              <input
                className={'form-control'}
                type="number"
                name="montantParDefautRedevance"
                onChange={handleChange}
                onBlur={handleSubmit}
                value={values.montantParDefautRedevance}
              />
              {errors.montantParDefautRedevance && touched.montantParDefautRedevance && errors.montantParDefautRedevance}
            </div>

            {/* Pourcentage Part Acquisitive */}
            <div className={"form-group col-md-2"}>
              <label>Pourcentage part acquisitive</label>
              <input
                className={'form-control'}
                type="number"
                name="pourcentagePartAcquisitive"
                onChange={handleChange}
                onBlur={handleSubmit}
                value={values.pourcentagePartAcquisitive}
              />
              {errors.pourcentagePartAcquisitive && touched.pourcentagePartAcquisitive && errors.pourcentagePartAcquisitive}
            </div>

            {/* Pourcentage Reserve Habitants */}
            <div className={"form-group col-md-2"}>
              <label>Pourcentage réserve habitants</label>
              <input
                className={'form-control'}
                type="number"
                name="pourcentageReserveHabitants"
                onChange={handleChange}
                onBlur={handleSubmit}
                value={values.pourcentageReserveHabitants}
              />
              {errors.pourcentageReserveHabitants && touched.pourcentageReserveHabitants && errors.pourcentageReserveHabitants}
            </div>

            {/* Duree Simulation */}
            <div className={"form-group col-md-2"}>
              <label>Durée Simulation</label>
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

            {/* Montrer Difference */}
            <div className={"form-group col-md-2"}>
              <label>Montrer Difference</label>
              <input
                className={'form-control'}
                type="checkbox"
                name="montrerDifference"
                onChange={handleChange}
                onBlur={handleSubmit}
                value={values.montrerDifference}
                checked={values.montrerDifference && 'checked'}
              />
              {errors.montrerDifference && touched.montrerDifference && errors.montrerDifference}
            </div>

            <button type="button" onClick={_ajouterNouveauHabitant}>
              Ajouter un habitant
            </button>

            <button type="button" onClick={_exportSimulation}>
              Exporter simulation
            </button>


            <button type="button" onClick={() => hiddenFileImportInputRef.current.click() }>
              Importer simulation
            </button>
            <input
              style={{display: 'none'}}
              ref={hiddenFileImportInputRef}
              type={'file'}
              onChange={_importSimulation}
            />

          </form>
        )}
      </Formik>

      <table className={'table'}>

        {/* Entetes tableau */}
        <thead>
          <tr>
            <th colSpan={6}> </th>
            {simulationReserveHabitants.map(simulationAnnee => (
              <th key={simulationAnnee.annee} colSpan={2}>Année {simulationAnnee.annee}</th>
            ))}
          </tr>
          <tr>
            <th colSpan={2}> </th>
            <th>Année entrée</th>
            <th>Année sortie</th>
            <th>CCA Initial</th>
            <th>Redevance</th>
            {simulationReserveHabitants.map(simulationAnnee => (
              <React.Fragment key={simulationAnnee.annee}>
                {montrerDifference && <th>Diff.</th>}
                <th colSpan={montrerDifference ? 1 : 2}>Montant</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>

        {/* Evolution enveloppe habitant */}
        <tbody>
          <tr>
            <th colSpan={2} className={'stickyColumn firstColumn'}>Enveloppe habitant</th>
            <th colSpan={4}> </th>
            {simulationReserveHabitants.map(simulationAnnee => (
              <React.Fragment key={simulationAnnee.annee}>
                {montrerDifference && (
                  <td>{Math.ceil(simulationAnnee.difference)}</td>
                )}
                <td colSpan={montrerDifference ? 1 : 2}>
                  {Math.ceil(simulationAnnee.montant)}
                </td>
              </React.Fragment>
            ))}
          </tr>

          {/* Evolution CCA habitants */}
          {etatInitialHabitants.map(habitant => (
            <tr key={habitant.id}>
              <th>{habitant.id}</th>
              <th className={'stickyColumn firstColumn'}>{habitant.nom}</th>
              <Formik
                initialValues={habitant}
                //enableReinitialize={true}
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
                  <>
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
                        value={values.redevance}
                        name={'redevance'}
                        onChange={handleChange}
                        onBlur={handleSubmit}
                      />
                    </th>
                  </>
                )}
              </Formik>

              {simulationReserveHabitants.map(simulationAnnee => {
                let simulationHabitant = simulationHabitants[habitant.id] && simulationHabitants[habitant.id].find(simulationAnneeHabitant => simulationAnneeHabitant.annee === simulationAnnee.annee)
                if(simulationHabitant === undefined) {
                  return <React.Fragment key={simulationAnnee.annee}><td> </td><td> </td></React.Fragment>
                }
                return (
                  <React.Fragment key={simulationAnnee.annee}>
                    {montrerDifference && (
                      <td>{Math.ceil(simulationHabitant.difference)}</td>
                    )}
                    <td
                      colSpan={montrerDifference ? 1 : 2}
                      style={simulationHabitant.sortie && { color: 'green' }}
                    >
                      {Math.ceil(simulationHabitant.cca)}
                    </td>
                  </React.Fragment>
                )
              })}
            </tr>
          ))}
        </tbody>

      </table>
    </div>
  );
}

export default App;
