use color_eyre::Result;

pub fn validate_and_count_csv(data: &[u8]) -> Result<usize> {
    let content = String::from_utf8(data.to_vec())?;

    let mut reader = csv::Reader::from_reader(content.as_bytes());
    let mut row_count = 0;

    // Validate headers exist
    let _headers = reader.headers()?;

    // Count and validate rows
    for result in reader.records() {
        match result {
            Ok(_) => row_count += 1,
            Err(e) => {
                return Err(color_eyre::eyre::eyre!(
                    "Invalid CSV row at {}: {}",
                    row_count + 1,
                    e
                ));
            }
        }
    }

    Ok(row_count)
}

pub async fn csv_bytes_to_string(data: &[u8]) -> Result<String> {
    let content = String::from_utf8(data.to_vec())?;

    Ok(content)
}
