package org.vesper.dto.uala;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Builder;
import lombok.Data;

// DTO para pedir el token
@Data @Builder
public class UalaAuthRequest {
    private String username;
    @JsonProperty("client_id")
    private String clientId;
    @JsonProperty("client_secret_id")
    private String clientSecretId;
    @JsonProperty("grant_type")
    private String grantType; // Siempre será "client_credentials"
}