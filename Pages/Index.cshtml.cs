using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace ESP_SmartPrognostics.Pages
{
    public class IndexModel : PageModel
    {
        private readonly ILogger<IndexModel> _logger;

        [BindProperty(SupportsGet = true)]
        public float Cycle { get; set; } = 420;

        [BindProperty(SupportsGet = true)]
        public float Voltage { get; set; } = 380;

        [BindProperty(SupportsGet = true)]
        public float Current_A { get; set; } = 13.8f;

        [BindProperty(SupportsGet = true)]
        public float Vibration_RMS { get; set; } = 0.42f;

        [BindProperty(SupportsGet = true)]
        public float Temperature_C { get; set; } = 68;

        [BindProperty(SupportsGet = true)]
        public float Health_Index { get; set; } = 84;

        public float RemainingLife { get; private set; }
        public float DegradationPercent { get; private set; }
        public float ConfidenceScore { get; private set; }
        public string EngineModel { get; private set; } = "ESP-75 Dərinlik Nasos Mühərriki";
        public string SerialNumber { get; private set; } = "SN-ESP-2048-AZ";
        public string ModelStatus { get; private set; } = "ML.NET LightGBM reqressiya modeli";
        public string RiskLevel { get; private set; } = "Normal";
        public string RiskClass { get; private set; } = "normal";
        public string Recommendation { get; private set; } = "Mühərrik sabit işləyir. Planlı monitorinqi davam etdirin.";
        public string MaintenanceCommand { get; private set; } = "Planlı monitorinqi davam etdir";
        public string AnomalyState { get; private set; } = "qeyri-normal hal yoxdur";
        public string FaultLabel { get; private set; } = "Yastıq aşınması";
        public int BearingFault { get; private set; }
        public int StatorFault { get; private set; }
        public int RotorFault { get; private set; }

        public IndexModel(ILogger<IndexModel> logger)
        {
            _logger = logger;
        }

        public void OnGet()
        {
            var input = new MLModel.ModelInput
            {
                Timestamp = DateTime.Now.ToString("O"),
                Motor_ID = "ESP-2048",
                Motor_Model = EngineModel,
                Condition = EstimateCondition(),
                Operating_Hours = Cycle,
                Voltage_V = Voltage,
                Current_A = Current_A,
                Motor_Temperature_C = Temperature_C,
                Vibration_g = Vibration_RMS,
                Health_Index = Health_Index
            };

            try
            {
                RemainingLife = MathF.Max(0, MLModel.Predict(input).Score);
                ApplySensorSafetyLimits();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "ML.NET model could not be loaded. Dashboard fallback score is used.");
                RemainingLife = EstimateFallbackRemainingLife();
                ApplySensorSafetyLimits();
                ModelStatus = "Demo rejimi: model faylı və ya paketlər yüklənməyib";
            }

            SetRiskState();
            SetFaultSpectrum();
            SetDerivedAnalytics();
        }

        private float EstimateFallbackRemainingLife()
        {
            var degradation =
                (Cycle * 0.28f) +
                (MathF.Abs(Voltage - 380) * 1.8f) +
                (Current_A * 10.5f) +
                (Vibration_RMS * 340f) +
                (Temperature_C * 4.2f) -
                (Health_Index * 5.5f);

            return MathF.Max(35, 980 - degradation);
        }

        private string EstimateCondition()
        {
            if (Health_Index < 55 || Vibration_RMS >= 4.5f || Temperature_C >= 85 || Current_A >= 16)
            {
                return "Critical";
            }

            if (Health_Index < 80 || Vibration_RMS >= 2.8f || Temperature_C >= 70 || Current_A >= 13 || Voltage < 360 || Voltage > 410)
            {
                return "Warning";
            }

            return "Normal";
        }

        private void ApplySensorSafetyLimits()
        {
            var dangerousCount = CountDangerousSensors();
            var warningCount = CountWarningSensors();

            if (dangerousCount >= 3)
            {
                RemainingLife = MathF.Min(RemainingLife, 120);
            }
            else if (dangerousCount > 0)
            {
                RemainingLife = MathF.Min(RemainingLife, 220);
            }
            else if (warningCount > 0)
            {
                RemainingLife = MathF.Min(RemainingLife, 520);
            }
        }

        private int CountDangerousSensors()
        {
            var count = 0;
            if (Voltage < 340 || Voltage > 430) count++;
            if (Current_A > 16) count++;
            if (Temperature_C > 85) count++;
            if (Vibration_RMS > 4.5f) count++;
            return count;
        }

        private int CountWarningSensors()
        {
            var count = 0;
            if ((Voltage < 360 || Voltage > 410) && Voltage >= 340 && Voltage <= 430) count++;
            if (Current_A > 13 && Current_A <= 16) count++;
            if (Temperature_C > 70 && Temperature_C <= 85) count++;
            if (Vibration_RMS > 2.8f && Vibration_RMS <= 4.5f) count++;
            return count;
        }

        private void SetRiskState()
        {
            if (RemainingLife < 200)
            {
                RiskLevel = "Kritik";
                RiskClass = "critical";
                Recommendation = "Təcili dayandırma planı hazırlayın. Yastıq, rotor və soyutma kanallarını yoxlayın.";
                MaintenanceCommand = "Mühərriki dayandır və yastıq blokunu yoxla";
            }
            else if (RemainingLife < 500)
            {
                RiskLevel = "Nəzarət";
                RiskClass = "warning";
                Recommendation = "Növbəti texniki baxışı planlaşdırın. Yağlama və soyutma səviyyəsini yoxlayın.";
                MaintenanceCommand = "Yastığı yağla və soyutmanı yoxla";
            }
            else
            {
                RiskLevel = "Normal";
                RiskClass = "normal";
                Recommendation = "Mühərrik sabit işləyir. Planlı monitorinqi davam etdirin.";
                MaintenanceCommand = "Planlı monitorinqi davam etdir";
            }
        }

        private void SetFaultSpectrum()
        {
            BearingFault = Math.Clamp((int)Math.Round(35 + Vibration_RMS * 55), 25, 78);
            StatorFault = Math.Clamp((int)Math.Round(18 + Math.Max(0, Current_A - 10) * 3.8), 12, 45);
            RotorFault = Math.Clamp(100 - BearingFault - StatorFault, 8, 42);

            var total = BearingFault + StatorFault + RotorFault;
            BearingFault = (int)Math.Round(BearingFault * 100m / total);
            StatorFault = (int)Math.Round(StatorFault * 100m / total);
            RotorFault = Math.Max(0, 100 - BearingFault - StatorFault);

            FaultLabel = BearingFault >= StatorFault && BearingFault >= RotorFault
                ? "Yastıq aşınması"
                : StatorFault >= RotorFault
                    ? "Stator izolyasiyası"
                    : "Rotor balanssızlığı";
        }

        private void SetDerivedAnalytics()
        {
            var sensorDegradation =
                (CountDangerousSensors() * 22) +
                (CountWarningSensors() * 9) +
                MathF.Max(0, MathF.Abs(Voltage - 380) * 0.25f) +
                MathF.Max(0, (Temperature_C - 70) * 0.35f) +
                MathF.Max(0, (Vibration_RMS - 2.8f) * 5.5f);

            DegradationPercent = Math.Clamp(MathF.Max(100 - Health_Index, sensorDegradation), 0, 100);
            ConfidenceScore = Math.Clamp(96 - DegradationPercent * 0.45f - (Vibration_RMS * 1.4f), 45, 98);

            AnomalyState = Vibration_RMS >= 0.72f || Temperature_C >= 84 || Current_A >= 16
                ? "qeyri-normal hal aşkarlanıb"
                : "Siqnal sabitdir";

            if (FaultLabel.Contains("Yastıq"))
            {
                MaintenanceCommand = RemainingLife < 500
                    ? "Yastığı yağla və texniki baxış planlaşdır"
                    : MaintenanceCommand;
            }
            else if (FaultLabel.Contains("Stator"))
            {
                MaintenanceCommand = "Gərginliyi tənzimlə və izolyasiyanı yoxla";
            }
            else if (FaultLabel.Contains("Rotor"))
            {
                MaintenanceCommand = "Rotor balansını və mufta mərkəzlənməsini yoxla";
            }
        }
    }
}
