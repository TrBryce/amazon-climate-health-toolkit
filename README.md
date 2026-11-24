# Amazon Climate–Health Data Harmonizer

An open-source, browser-based demonstration for harmonizing climate, environment and health records in the Peruvian Amazon. It standardizes common Spanish/English field names, derives hydrological season, summarizes selected health outcomes, performs basic quality checks and exports an analysis-ready CSV.

**Created by:** Kervin B. Tapayuri-Rengifo, Biologist, M.Sc.  
**Professional focus:** Tropical infectious diseases, One Health, school and community health, and Amazonian surveillance.

## Why this project

In Amazonian settings, health records are often collected separately from rainfall, flooding, water-quality and WASH information. This small toolkit demonstrates a transparent workflow for bringing those variables into a consistent structure that can support descriptive surveillance and further statistical analysis.

## Live features

- Upload a local CSV or load the included synthetic demonstration.
- Recognize common English and Spanish column names.
- Standardize binary values such as `yes/no`, `sí/no`, `positive/negative` and `1/0`.
- Classify dates as **Rising-water (December–May)** or **Falling-water (June–November)**.
- Summarize enteroparasite positivity, malaria positivity and anemia.
- Compare descriptive prevalence by hydrological season.
- Check missing dates, unknown locations and duplicate record IDs.
- Export the filtered, harmonized dataset.
- Process all data locally in the browser; no server or database is used.

## Quick start

### Browser application

1. Open `index.html` in a modern browser, or visit the GitHub Pages link for this repository.
2. Select **Load synthetic demo**.
3. Filter by location or hydrological season.
4. Select **Download harmonized CSV** to export the current selection.

### Reproducible R workflow

The R script uses only base R and requires no additional packages.

```bash
Rscript analysis/harmonize_and_model.R
```

It writes three files to `outputs/`:

- `harmonized_climate_health_data.csv`
- `seasonal_health_summary.csv`
- `illustrative_logistic_model.csv`

To use a different file and output directory:

```bash
Rscript analysis/harmonize_and_model.R path/to/input.csv path/to/outputs
```

## Recommended schema

| Standard field | Examples of recognized aliases | Meaning |
|---|---|---|
| `record_id` | `id`, `codigo`, `participant_id` | De-identified record identifier |
| `date` | `fecha`, `sample_date`, `screening_date` | Observation or screening date |
| `location` | `distrito`, `community`, `localidad` | Geographic unit |
| `rainfall_mm` | `lluvia_mm`, `precipitation_mm` | Rainfall measurement |
| `flood_level_cm` | `nivel_inundacion_cm`, `nivel_rio_cm` | Flood or river-level indicator |
| `water_ecoli_cfu` | `e_coli_ufc`, `calidad_agua_ecoli` | Water-quality indicator |
| `parasite_positive` | `parasitosis`, `resultado_parasitos` | Binary enteroparasite outcome |
| `malaria_positive` | `malaria`, `resultado_malaria` | Binary malaria outcome |
| `hemoglobin_g_dl` | `hemoglobina`, `hb` | Hemoglobin measurement |
| `anemia` | `estado_anemia`, `anemia_status` | Pre-classified anemia outcome |

The tool does **not** infer anemia from hemoglobin because valid thresholds depend on age, sex, pregnancy status and altitude. Provide a pre-classified `anemia` variable based on the protocol used by your study.

## Repository structure

```text
.
├── index.html                       # User interface
├── styles.css                      # Responsive visual design
├── app.js                          # CSV parsing, harmonization and summaries
├── analysis/
│   └── harmonize_and_model.R       # Reproducible base-R workflow
├── data/
│   └── sample_climate_health.csv   # Synthetic demonstration data
├── LICENSE
└── README.md
```

## Data protection and limitations

- The included dataset is entirely synthetic.
- Do not publish names, identity documents, exact addresses or other personal identifiers.
- The application is for research training and exploratory analysis. It is **not** a clinical diagnostic device.
- The seasonal comparisons are descriptive and do not establish causal effects.
- The example logistic model is illustrative; a real analysis requires adequate sample size, confounder control, diagnostics and validation.

## Suggested citation

Tapayuri-Rengifo KB. *Amazon Climate–Health Data Harmonizer* [software]. 2026. Available from this repository.

## License

MIT License. See [LICENSE](LICENSE).
