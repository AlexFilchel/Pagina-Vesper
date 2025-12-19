package org.vesper.dto.uala;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

// DTO para recibir el token
@Data
public class UalaAuthResponse {
    @JsonProperty("access_token")
    private String accessToken;
    @JsonProperty("expires_in")
    private int expiresIn;
}