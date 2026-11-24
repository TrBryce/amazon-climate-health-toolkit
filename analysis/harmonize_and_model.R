#!/usr/bin/env Rscript

# Amazon Climate-Health Data Harmonizer
# Reproducible base-R workflow; no additional packages required.
# Usage from the repository root:
#   Rscript analysis/harmonize_and_model.R
# Optional:
#   Rscript analysis/harmonize_and_model.R path/to/input.csv output_directory

args <- commandArgs(trailingOnly = TRUE)
input_file <- if (length(args) >= 1) args[[1]] else "data/sample_climate_health.csv"
output_dir <- if (length(args) >= 2) args[[2]] else "outputs"

if (!file.exists(input_file)) stop("Input file not found: ", input_file)
if (!dir.exists(output_dir)) dir.create(output_dir, recursive = TRUE)

normalize_name <- function(x) {
  x <- iconv(x, to = "ASCII//TRANSLIT")
  x <- tolower(trimws(x))
  x <- gsub("[^a-z0-9]+", "_", x)
  gsub("^_|_$", "", x)
}

aliases <- list(
  record_id = c("record_id", "id", "codigo", "participant_id"),
  date = c("date", "fecha", "sample_date", "screening_date"),
  location = c("location", "distrito", "district", "localidad", "community", "comunidad"),
  age = c("age", "edad", "age_years", "edad_anos"),
  sex = c("sex", "sexo", "gender"),
  rainfall_mm = c("rainfall_mm", "lluvia_mm", "precipitation_mm", "precipitacion_mm"),
  flood_level_cm = c("flood_level_cm", "nivel_inundacion_cm", "river_level_cm", "nivel_rio_cm"),
  water_ecoli_cfu = c("water_ecoli_cfu", "ecoli_cfu", "e_coli_ufc", "calidad_agua_ecoli"),
  parasite_positive = c("parasite_positive", "parasitosis", "parasite_result", "resultado_parasitos"),
  parasite_species = c("parasite_species", "especie_parasito", "taxon", "parasite_taxon"),
  malaria_positive = c("malaria_positive", "malaria", "malaria_result", "resultado_malaria"),
  plasmodium_species = c("plasmodium_species", "especie_plasmodium", "plasmodium"),
  hemoglobin_g_dl = c("hemoglobin_g_dl", "hemoglobina", "hb", "hb_g_dl"),
  anemia = c("anemia", "anemia_status", "estado_anemia"),
  wash_access = c("wash_access", "acceso_wash", "safe_water_access", "agua_segura")
)

raw <- read.csv(input_file, stringsAsFactors = FALSE, check.names = FALSE, na.strings = c("", "NA", "N/A"))
names(raw) <- normalize_name(names(raw))

find_column <- function(target) {
  candidates <- normalize_name(aliases[[target]])
  match <- candidates[candidates %in% names(raw)]
  if (length(match)) match[[1]] else NA_character_
}

get_value <- function(target, default = NA) {
  column <- find_column(target)
  if (is.na(column)) rep(default, nrow(raw)) else raw[[column]]
}

normalize_binary <- function(x) {
  value <- normalize_name(ifelse(is.na(x), "", x))
  result <- rep(NA_integer_, length(value))
  result[value %in% c("yes", "si", "positive", "positivo", "1", "true", "present", "presente")] <- 1L
  result[value %in% c("no", "negative", "negativo", "0", "false", "absent", "ausente")] <- 0L
  result
}

parse_date <- function(x) {
  x <- as.character(x)
  parsed <- as.Date(x, tryFormats = c("%Y-%m-%d", "%Y/%m/%d", "%d/%m/%Y", "%d-%m-%Y"))
  parsed
}

date <- parse_date(get_value("date"))
month <- as.integer(format(date, "%m"))
hydrological_season <- ifelse(is.na(month), NA, ifelse(month >= 12 | month <= 5, "Rising-water", "Falling-water"))

harmonized <- data.frame(
  record_id = ifelse(is.na(get_value("record_id")), sprintf("REC%04d", seq_len(nrow(raw))), get_value("record_id")),
  date = date,
  location = ifelse(is.na(get_value("location")), "Unknown", get_value("location")),
  hydrological_season = hydrological_season,
  age = suppressWarnings(as.numeric(get_value("age"))),
  sex = get_value("sex"),
  rainfall_mm = suppressWarnings(as.numeric(get_value("rainfall_mm"))),
  flood_level_cm = suppressWarnings(as.numeric(get_value("flood_level_cm"))),
  water_ecoli_cfu = suppressWarnings(as.numeric(get_value("water_ecoli_cfu"))),
  wash_access = normalize_binary(get_value("wash_access")),
  parasite_positive = normalize_binary(get_value("parasite_positive")),
  parasite_species = get_value("parasite_species"),
  malaria_positive = normalize_binary(get_value("malaria_positive")),
  plasmodium_species = get_value("plasmodium_species"),
  hemoglobin_g_dl = suppressWarnings(as.numeric(get_value("hemoglobin_g_dl"))),
  anemia = normalize_binary(get_value("anemia")),
  stringsAsFactors = FALSE
)

prevalence <- function(x) {
  reported <- x[!is.na(x)]
  if (!length(reported)) return(NA_real_)
  mean(reported == 1) * 100
}

seasons <- unique(na.omit(harmonized$hydrological_season))
summary_table <- do.call(rbind, lapply(seasons, function(season) {
  subset <- harmonized[harmonized$hydrological_season == season, ]
  data.frame(
    hydrological_season = season,
    records = nrow(subset),
    parasite_positive_pct = prevalence(subset$parasite_positive),
    malaria_positive_pct = prevalence(subset$malaria_positive),
    anemia_pct = prevalence(subset$anemia),
    mean_rainfall_mm = mean(subset$rainfall_mm, na.rm = TRUE),
    mean_flood_level_cm = mean(subset$flood_level_cm, na.rm = TRUE)
  )
}))

# Demonstration logistic model. Coefficients are illustrative because the included
# dataset is synthetic and small. Replace it with an adequately powered dataset.
model_data <- harmonized[complete.cases(harmonized[, c("parasite_positive", "rainfall_mm", "flood_level_cm", "age")]), ]
model_output <- data.frame()
if (nrow(model_data) >= 10 && length(unique(model_data$parasite_positive)) == 2) {
  fit <- glm(parasite_positive ~ scale(rainfall_mm) + scale(flood_level_cm) + age,
             data = model_data, family = binomial())
  coefs <- summary(fit)$coefficients
  model_output <- data.frame(
    term = rownames(coefs),
    estimate = coefs[, "Estimate"],
    standard_error = coefs[, "Std. Error"],
    p_value = coefs[, "Pr(>|z|)"],
    row.names = NULL
  )
}

write.csv(harmonized, file.path(output_dir, "harmonized_climate_health_data.csv"), row.names = FALSE, na = "")
write.csv(summary_table, file.path(output_dir, "seasonal_health_summary.csv"), row.names = FALSE, na = "")
write.csv(model_output, file.path(output_dir, "illustrative_logistic_model.csv"), row.names = FALSE, na = "")

cat("Completed successfully.\n")
cat("Records:", nrow(harmonized), "\n")
cat("Outputs written to:", normalizePath(output_dir), "\n")
