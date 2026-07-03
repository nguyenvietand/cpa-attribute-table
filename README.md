# cpa-attribute-table

## Build & export package using Power Platform CLI and dotnet (recommended)

1. **Create a Solutions folder (if not exists):**
   ```sh
   mkdir Solutions
   cd Solutions
   ```
2. **Initialize a solution:**
   ```sh
   pac solution init --publisher-name developer --publisher-prefix dev
   ```
3. **Add reference to your PCF control project:**
   ```sh
   pac solution add-reference --path ../
   # Or use absolute path if needed
   # pac solution add-reference --path C:/Codes/PA-Custom-Components/chart-pcf
   ```
4. **Build the solution:**
   ```sh
   dotnet build --configuration Release
   dotnet build --configuration Release -p:SolutionPackageType=Unmanaged
   ```
   - The .zip file will be in `Solutions/bin/Release/` (e.g., `Solutions/bin/Release/<solution-name>.zip`).

5. **Import into PowerApps:**
   - Go to PowerApps Studio > Solutions > Import Solution.
   - Select the .zip file generated in the previous step.

---

> This method follows the official Microsoft documentation and is the most reliable for packaging and importing PCF controls into PowerApps.
[text](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/import-custom-controls)